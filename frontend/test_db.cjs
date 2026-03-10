const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

supabase.from('candidates')
    .select('*, onboarding_journeys(status)')
    .limit(2)
    .then(res => console.log(JSON.stringify(res.data, null, 2)));
