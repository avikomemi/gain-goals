// חיבור לענן — Supabase (פרויקט fitlog-il, פרנקפורט)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yyujypmksgtbaauzflfj.supabase.co',
  'sb_publishable_VpsD0L5t37-y36lLCosjvw_8cTRR85X',
);
