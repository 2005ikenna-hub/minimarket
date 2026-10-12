import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let client

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local.',
    )
  }

  client ??= createClient(supabaseUrl, supabaseAnonKey)
  return client
}

function throwIfError(error) {
  if (error) throw new Error(error.message)
}

export async function listProducts(signal) {
  const query = getClient()
    .from('products')
    .select('id, owner_id, title, description, category, price, thumbnail, rating, stock')
    .order('created_at', { ascending: false })

  if (signal) query.abortSignal(signal)

  const { data, error } = await query
  throwIfError(error)
  return data
}

export async function getCurrentSession() {
  const { data, error } = await getClient().auth.getSession()
  throwIfError(error)
  return data.session
}

export function subscribeToAuthChanges(callback) {
  const { data } = getClient().auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({
    email,
    password,
  })
  throwIfError(error)
  return data
}

export async function signUp(email, password) {
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
  })
  throwIfError(error)
  return data
}

export async function signOut() {
  const { error } = await getClient().auth.signOut()
  throwIfError(error)
}

export async function createProduct(product) {
  const { data, error } = await getClient()
    .from('products')
    .insert(product)
    .select('id, owner_id, title, description, category, price, thumbnail, rating, stock')
    .single()

  throwIfError(error)
  return data
}

export async function importDummyJsonProducts(ownerId) {
  const response = await fetch('https://dummyjson.com/products?limit=30')

  if (!response.ok) {
    throw new Error(`DummyJSON a répondu avec le statut ${response.status}.`)
  }

  const result = await response.json()

  if (!Array.isArray(result.products) || result.products.length === 0) {
    throw new Error("DummyJSON n'a renvoyé aucun produit à importer.")
  }

  const products = result.products.map(
    ({ id, title, description, category, price, thumbnail, rating, stock }) => ({
      source_id: id,
      owner_id: ownerId,
      title,
      description,
      category,
      price,
      thumbnail,
      rating,
      stock,
    }),
  )

  const { data, error } = await getClient()
    .from('products')
    .upsert(products, { onConflict: 'owner_id,source_id' })
    .select('id, owner_id, title, description, category, price, thumbnail, rating, stock')

  throwIfError(error)
  return data
}

export async function updateProduct(id, product) {
  const { data, error } = await getClient()
    .from('products')
    .update(product)
    .eq('id', id)
    .select('id, owner_id, title, description, category, price, thumbnail, rating, stock')
    .single()

  throwIfError(error)
  return data
}

export async function deleteProduct(id) {
  const { error } = await getClient().from('products').delete().eq('id', id)
  throwIfError(error)
}
