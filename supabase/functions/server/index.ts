import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { email, phone, password, firstName, lastName } = await c.req.json();

    // Validate input
    if (!email || !password || !phone) {
      return c.json({ error: "Email, phone and password are required" }, 400);
    }

    // Format phone number (must be in E.164 format: +60123456789)
    const formattedPhone = phone.replace(/[^\d+]/g, '').startsWith('+') 
      ? phone.replace(/[^\d+]/g, '') 
      : `+60${phone.replace(/\D/g, '')}`;

    // Create user with email first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password,
      email_confirm: true,
      user_metadata: { 
        phone: formattedPhone
      }
    });

    if (authError) {
      console.log(`Auth error during signup: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }

    // Update user to add phone number
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authData.user.id,
      { 
        phone: formattedPhone,
        phone_confirm: true
      }
    );

    if (updateError) {
      console.log(`Error updating phone: ${updateError.message}`);
    }

    // Create a user_profiles row using the service role client (bypasses RLS)
    try {
      await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          reward_points: 0,
          created_at: new Date().toISOString()
        });
    } catch (insertErr) {
      console.log(`Warning: failed to insert user_profiles for ${email}: ${insertErr}`);
      // not fatal; the frontend may retry updating the profile after signup
    }

    return c.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email: email,
        phone: formattedPhone
      }
    });
  } catch (error) {
    console.log(`Unexpected error during signup: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get email by phone endpoint
app.post("/make-server-09ae98d3/get-email-by-phone", async (c) => {
  try {
    const { phone } = await c.req.json();

    if (!phone) {
      return c.json({ error: "Phone is required" }, 400);
    }

    // List all users and find by phone in metadata
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log(`Error listing users: ${error.message}`);
      return c.json({ error: "Failed to find user" }, 500);
    }

    const user = users?.find(u => u.user_metadata?.phone === phone);

    if (!user || !user.email) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ email: user.email });
  } catch (error) {
    console.log(`Unexpected error: ${error}`);
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

    if (!voucherId || !pointsUsed) {
      return c.json({ error: "voucherId and pointsUsed are required" }, 400);
    }

    // Verify user has enough points
    const { data: history, error: historyError } = await supabase
      .from('refill_history')
      .select('reward_points')
      .eq('user_id', user.id);

    if (historyError) {
      return c.json({ error: "Failed to verify points" }, 500);
    }

    const totalPoints = history?.reduce((sum, record) => sum + (record.reward_points || 0), 0) || 0;

    if (totalPoints < pointsUsed) {
      return c.json({ error: "Insufficient points" }, 400);
    }

    return c.json({ 
      success: true,
      message: "Voucher redeemed successfully",
      remainingPoints: totalPoints - pointsUsed
    });
  } catch (error) {
    console.log(`Unexpected error redeeming voucher: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─────────────────────────────────────────────
// ESP32 ORDER ENDPOINTS
// ─────────────────────────────────────────────

/**
 * POST /place-order
 * Called by the frontend after payment is confirmed.
 * Creates a new order in the `orders` table with status "pending".
 * Requires: Authorization header with user access token.
 * Body: { brand, volume, location }
 */
app.post("/make-server-09ae98d3/place-order", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.log(`Authorization error while placing order: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { brand, volume, location } = await c.req.json();

    if (!brand || !volume || !location) {
      return c.json({ error: "brand, volume and location are required" }, 400);
    }

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        brand,
        volume,
        location,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.log(`Error inserting order: ${insertError.message}`);
      return c.json({ error: "Failed to place order" }, 500);
    }

    console.log(`Order placed: ${order.id} for ${brand} ${volume}ml at ${location}`);
    return c.json({ success: true, orderId: order.id, order });
  } catch (error) {
    console.log(`Unexpected error placing order: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * GET /get-order?location=KK1
 * Called by the ESP32 every few seconds to poll for new dispensing jobs.
 * Returns the oldest pending order for the given location and marks it "dispensing".
 * No auth required (ESP32 uses the anon key).
 */
app.get("/make-server-09ae98d3/get-order", async (c) => {
  try {
    const location = c.req.query('location');

    if (!location) {
      return c.json({ error: "location query parameter is required" }, 400);
    }

    // Find the oldest pending order for this location
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('location', location)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.log(`Error fetching order: ${fetchError.message}`);
      return c.json({ error: "Failed to fetch order" }, 500);
    }

    if (!orders || orders.length === 0) {
      return c.json({ status: "no order" });
    }

    const order = orders[0];

    // Mark the order as dispensing so it is not picked up again
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'dispensing' })
      .eq('id', order.id);

    if (updateError) {
      console.log(`Error updating order status: ${updateError.message}`);
      return c.json({ error: "Failed to update order status" }, 500);
    }

    console.log(`ESP32 picked up order: ${order.id} – ${order.brand} ${order.volume}ml`);
    return c.json({
      status: "order",
      orderId: order.id,
      brand: order.brand,
      volume: order.volume,
      location: order.location,
    });
  } catch (error) {
    console.log(`Unexpected error in get-order: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * POST /complete-order
 * Called by the ESP32 after the pump has dispensed the required volume.
 * Marks the order as "completed".
 * Body: { orderId }
 */
app.post("/make-server-09ae98d3/complete-order", async (c) => {
  try {
    const { orderId } = await c.req.json();

    if (!orderId) {
      return c.json({ error: "orderId is required" }, 400);
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (updateError) {
      console.log(`Error completing order ${orderId}: ${updateError.message}`);
      return c.json({ error: "Failed to complete order" }, 500);
    }

    console.log(`Order completed: ${orderId}`);
    return c.json({ success: true, message: "Order marked as completed" });
  } catch (error) {
    console.log(`Unexpected error completing order: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);