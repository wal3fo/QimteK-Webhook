-- Enable Realtime for webhook requests table
-- This allows clients to subscribe to INSERT events on the requests table

-- Enable Realtime for the requests table
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

-- Optional: Enable Realtime for webhooks table (if you want to listen to webhook changes)
-- ALTER PUBLICATION supabase_realtime ADD TABLE webhooks;

-- Note: Realtime is enabled by default for tables in Supabase
-- This migration explicitly adds the tables to the Realtime publication
-- to ensure real-time updates work correctly
