import { supabase } from './supabase'
import { Deal } from './database.types'

function generateReference(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `DS-${year}-${random}`
}

export async function createDeal(
  userId: string,
  strategy: Deal['strategy'],
  inputs: Record<string, unknown>
): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: userId,
      reference: generateReference(),
      strategy,
      status: 'analysing',
      inputs
    })
    .select()
    .single()

  if (error) { console.error('createDeal error:', error); return null }
  return data
}

export async function updateDeal(
  dealId: string,
  inputs: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from('deals')
    .update({ inputs, updated_at: new Date().toISOString() })
    .eq('id', dealId)

  if (error) { console.error('updateDeal error:', error); return false }
  return true
}

export async function loadDeal(dealId: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single()

  if (error) { console.error('loadDeal error:', error); return null }
  return data
}

export async function listDeals(userId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) { console.error('listDeals error:', error); return [] }
  return data ?? []
}

export async function deleteDeal(dealId: string): Promise<boolean> {
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)

  if (error) { console.error('deleteDeal error:', error); return false }
  return true
}
