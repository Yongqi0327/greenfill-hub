import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-09ae98d3/health", (c) => {
  return c.json({ status: "ok" });
});

// User Registration endpoint
app.post("/make-server-09ae98d3/signup", async (c) => {
  try {
    const { email, phone, password } = await c.req.json();

    // Validate input
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { phone },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (authError) {
      console.log(`Auth error during signup: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }

    return c.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email: email
      }
    });
  } catch (error) {
    console.log(`Unexpected error during signup: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user profile endpoint
app.get("/make-server-09ae98d3/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while fetching profile: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log(`Error fetching profile for user ${user.id}: ${profileError.message}`);
      return c.json({ error: "Failed to fetch profile" }, 500);
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Unexpected error fetching profile: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add refill history endpoint
app.post("/make-server-09ae98d3/add-refill", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while adding refill: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { brand, volume, totalPrice, location, paymentMethod } = await c.req.json();

    // Calculate reward points (1 point per RM spent)
    const pointsEarned = Math.floor(totalPrice);

    // Insert refill record into refill_history table
    const { error: insertError } = await supabase
      .from('refill_history')
      .insert({
        user_id: user.id,
        email: user.email,
        brand,
        volume,
        location,
        total_price: totalPrice,
        payment_method: paymentMethod,
        reward_points: pointsEarned,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.log(`Error inserting refill history: ${insertError.message}`);
      return c.json({ error: "Failed to record refill" }, 500);
    }

    return c.json({ 
      success: true,
      pointsEarned
    });
  } catch (error) {
    console.log(`Unexpected error adding refill: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get refill history endpoint
app.get("/make-server-09ae98d3/refill-history", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while fetching refill history: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get refill history
    const { data: history, error: historyError } = await supabase
      .from('refill_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.log(`Error fetching refill history: ${historyError.message}`);
      return c.json({ error: "Failed to fetch refill history" }, 500);
    }

    // Calculate total points
    const totalPoints = history?.reduce((sum, record) => sum + (record.reward_points || 0), 0) || 0;

    return c.json({ 
      history: history || [],
      totalPoints
    });
  } catch (error) {
    console.log(`Unexpected error fetching refill history: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Redeem voucher endpoint
app.post("/make-server-09ae98d3/redeem-voucher", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while redeeming voucher: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { voucherId, pointsUsed } = await c.req.json();

    // Insert voucher redemption record
    const { error: insertError } = await supabase
      .from('voucher_redemptions')
      .insert({
        user_id: user.id,
        email: user.email,
        voucher_id: voucherId,
        points_used: pointsUsed,
        redeemed_at: new Date().toISOString()
      });

    if (insertError) {
      console.log(`Error inserting voucher redemption: ${insertError.message}`);
      return c.json({ error: "Failed to redeem voucher" }, 500);
    }

    return c.json({ 
      success: true,
      message: "Voucher redeemed successfully"
    });
  } catch (error) {
    console.log(`Unexpected error redeeming voucher: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);