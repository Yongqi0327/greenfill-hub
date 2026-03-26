// /*
//  * GreenFill Hub – ESP32 Dispenser Controller
//  * 
//  * This sketch polls the GreenFill Hub backend for pending orders,
//  * activates the pump relay when an order is found, measures volume
//  * via a flow sensor, then marks the order as complete.
//  *
//  * Hardware connections:
//  *   - Relay (pump control) → GPIO 5
//  *   - Flow sensor signal   → GPIO 4  (YF-S201 or similar)
//  *   - Built-in LED         → GPIO 2  (status indicator)
//  *
//  * Dependencies (install via Arduino Library Manager):
//  *   - WiFi (built-in ESP32)
//  *   - HTTPClient (built-in ESP32)
//  *   - ArduinoJson  (by Benoit Blanchon, v6.x)
//  */

// #include <WiFi.h>
// #include <HTTPClient.h>
// #include <ArduinoJson.h>

// // ─── CONFIGURATION ───────────────────────────────────────────────────────────

// // Wi-Fi credentials  ← change these to your network
// const char* WIFI_SSID     = "YOUR_WIFI_SSID";
// const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// // GreenFill Hub backend
// const char* SERVER_BASE   = "https://qlwyryxlhcsvwditzzpe.supabase.co/functions/v1/make-server-09ae98d3";
// const char* ANON_KEY      = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsd3lyeXhsaGNzdndkaXR6enBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTk4NTksImV4cCI6MjA4MjA3NTg1OX0.F4-mDahq8kL93X_7oJAON8JGzbNhtLSR6R0nCanVqKU";

// // Location tag – must match the value set on the website (e.g. "KK1")
// const char* LOCATION      = "KK1";

// // ─── PIN DEFINITIONS ─────────────────────────────────────────────────────────

// const int RELAY_PIN       = 5;   // HIGH = pump ON
// const int FLOW_SENSOR_PIN = 4;   // Interrupt-capable pin
// const int LED_PIN         = 2;   // Built-in LED (status)

// // ─── FLOW SENSOR ─────────────────────────────────────────────────────────────
// // YF-S201: ~7.5 pulses per second per litre/min → ~450 pulses / litre

// volatile long pulseCount = 0;
// float mlPerPulse         = 1000.0 / 450.0;  // ≈ 2.22 ml per pulse

// void IRAM_ATTR onPulse() {
//   pulseCount++;
// }

// // ─── POLL INTERVAL ───────────────────────────────────────────────────────────

// const unsigned long POLL_INTERVAL_MS = 5000;   // Poll every 5 seconds
// unsigned long lastPollTime = 0;

// // ─── SETUP ───────────────────────────────────────────────────────────────────

// void setup() {
//   Serial.begin(115200);
//   delay(500);

//   // Pin setup
//   pinMode(RELAY_PIN, OUTPUT);
//   digitalWrite(RELAY_PIN, LOW);  // Pump off by default

//   pinMode(LED_PIN, OUTPUT);
//   digitalWrite(LED_PIN, LOW);

//   pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
//   attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), onPulse, RISING);

//   // Connect to Wi-Fi
//   Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
//   WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500);
//     Serial.print(".");
//   }

//   Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
//   blinkLED(3);  // 3 blinks = ready
// }

// // ─── MAIN LOOP ───────────────────────────────────────────────────────────────

// void loop() {
//   unsigned long now = millis();

//   if (now - lastPollTime >= POLL_INTERVAL_MS) {
//     lastPollTime = now;
//     checkForOrder();
//   }
// }

// // ─── POLL FOR ORDER ──────────────────────────────────────────────────────────

// void checkForOrder() {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("[WiFi] Not connected, skipping poll...");
//     return;
//   }

//   HTTPClient http;
//   String url = String(SERVER_BASE) + "/get-order?location=" + LOCATION;
//   http.begin(url);
//   http.addHeader("Authorization", String("Bearer ") + ANON_KEY);

//   int httpCode = http.GET();
//   Serial.printf("[Poll] GET %s → %d\n", url.c_str(), httpCode);

//   if (httpCode == 200) {
//     String payload = http.getString();
//     Serial.println("[Poll] Response: " + payload);

//     StaticJsonDocument<512> doc;
//     DeserializationError err = deserializeJson(doc, payload);

//     if (err) {
//       Serial.println("[Poll] JSON parse error");
//       http.end();
//       return;
//     }

//     const char* status = doc["status"];

//     if (strcmp(status, "order") == 0) {
//       const char* orderId = doc["orderId"];
//       float volumeMl      = doc["volume"];
//       const char* brand   = doc["brand"];

//       Serial.printf("[Order] %s – %.0f ml of %s\n", orderId, volumeMl, brand);
//       activatePump(orderId, volumeMl);
//     } else {
//       Serial.println("[Poll] No pending order.");
//     }
//   } else {
//     Serial.printf("[Poll] HTTP error: %d\n", httpCode);
//   }

//   http.end();
// }

// // ─── PUMP CONTROL ────────────────────────────────────────────────────────────

// void activatePump(const char* orderId, float targetVolumeMl) {
//   Serial.printf("[Pump] Starting – target %.0f ml\n", targetVolumeMl);

//   // Reset pulse counter
//   noInterrupts();
//   pulseCount = 0;
//   interrupts();

//   // Turn pump ON
//   digitalWrite(RELAY_PIN, HIGH);
//   digitalWrite(LED_PIN, HIGH);

//   // Wait until the flow sensor counts enough pulses
//   float dispensedMl = 0.0;
//   unsigned long pumpStart = millis();
//   const unsigned long PUMP_TIMEOUT_MS = 60000;  // 60-second safety timeout

//   while (dispensedMl < targetVolumeMl) {
//     delay(100);

//     noInterrupts();
//     long currentPulses = pulseCount;
//     interrupts();

//     dispensedMl = currentPulses * mlPerPulse;

//     // Safety timeout
//     if (millis() - pumpStart > PUMP_TIMEOUT_MS) {
//       Serial.println("[Pump] TIMEOUT – stopping pump");
//       break;
//     }
//   }

//   // Turn pump OFF
//   digitalWrite(RELAY_PIN, LOW);
//   digitalWrite(LED_PIN, LOW);

//   Serial.printf("[Pump] Done – dispensed %.1f ml\n", dispensedMl);

//   // Notify backend
//   completeOrder(orderId);
// }

// // ─── COMPLETE ORDER ──────────────────────────────────────────────────────────

// void completeOrder(const char* orderId) {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("[Complete] WiFi not connected, cannot mark order done");
//     return;
//   }

//   HTTPClient http;
//   String url = String(SERVER_BASE) + "/complete-order";
//   http.begin(url);
//   http.addHeader("Content-Type", "application/json");
//   http.addHeader("Authorization", String("Bearer ") + ANON_KEY);

//   // Build JSON body
//   StaticJsonDocument<128> doc;
//   doc["orderId"] = orderId;
//   String body;
//   serializeJson(doc, body);

//   int httpCode = http.POST(body);
//   Serial.printf("[Complete] POST /complete-order → %d\n", httpCode);

//   if (httpCode == 200) {
//     Serial.println("[Complete] Order marked as completed!");
//     blinkLED(5);  // 5 blinks = success
//   } else {
//     Serial.println("[Complete] Failed to complete order");
//   }

//   http.end();
// }

// // ─── HELPERS ─────────────────────────────────────────────────────────────────

// void blinkLED(int times) {
//   for (int i = 0; i < times; i++) {
//     digitalWrite(LED_PIN, HIGH);
//     delay(150);
//     digitalWrite(LED_PIN, LOW);
//     delay(150);
//   }
// }
