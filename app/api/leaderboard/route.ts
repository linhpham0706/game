import { NextResponse } from 'next/server';
import { supabase } from '../../../src/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('time', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, time, difficulty, date } = body;

    if (!name || time === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{ name, time, difficulty, date }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Leaderboard save error:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
