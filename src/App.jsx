import { useEffect, useMemo, useState } from 'react'
import {
  createProduct,
  deleteProduct as removeProduct,
  getCurrentSession,
  importDummyJsonProducts,
  listProducts,
  signIn,
  signOut,
  signUp,
  subscribeToAuthChanges,
  updateProduct,
} from './lib/supabase.js'
import './App.css'

const emptyProduct = {
  title: '',
  description: '',
  category: '',
  price: '',
  thumbnail: '',
  stock: '0',
}

function ProductImage({ src, alt, className }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className={`${className} image-placeholder`}>
        {src
          ? "Image inaccessible. Utilisez l'URL directe du fichier image."
          : 'Image non disponible'}
      </div>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  )
}

function AuthForm({ mode, message, onModeChange, onBack, onMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    onMessage('')

    try {
      if (mode === 'signup') {
        const { session } = await signUp(email.trim(), password)
        onMessage(
          session
            ? 'Compte créé et connecté.'
            : 'Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.',
        )
      } else {
        await signIn(email.trim(), password)
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Une erreur est survenue pendant l'authentification.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <p className="eyebrow">ESPACE MEMBRE</p>
      <h2 id="auth-title">
        {mode === 'signup' ? 'Créer un compte' : 'Se connecter'}
      </h2>
      <p>
        Connecte-toi pour publier des produits et gérer uniquement les tiens.
      </p>
      {message && (
        <p className="action-message action-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="action-message action-error" role="alert">
          {error}
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Adresse e-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="retry-button" type="submit" disabled={loading}>
          {loading
            ? 'Patiente...'
            : mode === 'signup'
              ? 'Créer mon compte'
              : 'Se connecter'}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'signup' ? 'Tu as déjà un compte ?' : 'Pas encore de compte ?'}{' '}
        <button
          type="button"
          onClick={() => onModeChange(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Se connecter' : "S'inscrire"}
        </button>
      </p>
      <button className="auth-back" type="button" onClick={onBack}>
        Retour au catalogue
      </button>
    </section>
  )
}

function ProductForm({ product, categories, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(
    product
      ? {
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          thumbnail: product.thumbnail || '',
          stock: String(product.stock ?? 0),
        }
      : emptyProduct,
  )

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      thumbnail: form.thumbnail.trim(),
      stock: Number(form.stock),
    })
  }

  return (
    <div className="modal-backdrop">
      <section
        className="product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{product ? 'MODIFICATION' : 'NOUVEAU PRODUIT'}</p>
            <h2 id="product-form-title">
              {product ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="Fermer"
            onClick={onCancel}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <label>
            Nom du produit
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              required
              maxLength={100}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              required
              rows={3}
              maxLength={500}
            />
          </label>
          <label>
            Catégorie
            <input
              name="category"
              list="product-categories"
              value={form.category}
              onChange={updateField}
              required
              maxLength={60}
            />
            <datalist id="product-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label>
            Prix (USD)
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={updateField}
              min="0"
              step="0.01"
              required
            />
          </label>
          <label>
            Quantité en stock
            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={updateField}
              min="0"
              step="1"
              required
            />
          </label>
          <label>
            Adresse de l'image (facultatif)
            <input
              name="thumbnail"
              type="url"
              value={form.thumbnail}
              onChange={updateField}
              placeholder="https://exemple.com/image.jpg"
            />
          </label>
          {form.thumbnail.trim() && (
            <div className="image-preview">
              <span>Aperçu de l'image</span>
              <ProductImage
                key={form.thumbnail.trim()}
                className="image-preview-content"
                src={form.thumbnail.trim()}
                alt="Aperçu du produit"
              />
            </div>
          )}
          <div className="dialog-actions">
            <button
              className="cancel-button"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Annuler
            </button>
            <button className="retry-button" type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : product ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
  }).format(price)

function App() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formProduct, setFormProduct] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading')
  const [authMode, setAuthMode] = useState(null)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    let authEventReceived = false
    let active = true
    const unsubscribe = subscribeToAuthChanges((session) => {
      authEventReceived = true
      if (!active) return
      setUser(session?.user ?? null)
      setAuthStatus('ready')
      setFormProduct(null)
      setIsCreating(false)
      if (session) setAuthMode(null)
    })

    getCurrentSession()
      .then((session) => {
        if (!active || authEventReceived) return
        setUser(session?.user ?? null)
        setAuthStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        setActionError(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier la session.",
        )
        setAuthStatus('error')
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setStatus('loading')
      setErrorMessage('')

      try {
        const data = await listProducts(controller.signal)

        if (!Array.isArray(data)) {
          throw new Error("Le format des données reçues n'est pas valide.")
        }

        setProducts(data)
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') return

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Une erreur inattendue est survenue.',
        )
        setStatus('error')
      }
    }

    loadProducts()

    return () => controller.abort()
  }, [reloadKey])

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  )

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('fr')

    return products.filter((product) => {
      const matchesSearch = product.title
        .toLocaleLowerCase('fr')
        .includes(normalizedSearch)
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  async function saveProduct(formData) {
    if (!user) {
      setAuthMode('signin')
      return
    }

    setSaving(true)
    setActionError('')
    setNotice('')

    const isEditing = Boolean(formProduct)

    try {
      const productData = isEditing
        ? await updateProduct(formProduct.id, formData)
        : await createProduct({ ...formData, owner_id: user.id })

      setProducts((currentProducts) =>
        isEditing
          ? currentProducts.map((item) =>
              item.id === productData.id ? productData : item,
            )
          : [productData, ...currentProducts],
      )
      setFormProduct(null)
      setIsCreating(false)
      setNotice(
        isEditing
          ? 'Produit modifié dans le catalogue.'
          : 'Produit ajouté au catalogue.',
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'enregistrement.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer « ${product.title} » ?`,
    )
    if (!confirmed) return

    setActionError('')
    setNotice('')

    try {
      await removeProduct(product.id)
      setProducts((currentProducts) =>
        currentProducts.filter((item) => item.id !== product.id),
      )
      setNotice('Produit supprimé du catalogue.')
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la suppression.',
      )
    }
  }

  async function importProducts() {
    if (!user) {
      setAuthMode('signin')
      return
    }

    setImporting(true)
    setActionError('')
    setNotice('')

    try {
      const importedProducts = await importDummyJsonProducts(user.id)
      setProducts((currentProducts) => {
        const importedIds = new Set(importedProducts.map((product) => product.id))
        return [
          ...importedProducts,
          ...currentProducts.filter((product) => !importedIds.has(product.id)),
        ]
      })
      setNotice(`${importedProducts.length} produits importés depuis DummyJSON.`)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l'importation.",
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Accueil MiniMarket">
          <span className="brand-icon" aria-hidden="true">
            M
          </span>
          <span>MiniMarket</span>
        </a>
        <span className="api-status">
          <span className="status-dot" />
          Supabase
        </span>
        {authStatus === 'loading' ? (
          <span className="auth-user">Vérification...</span>
        ) : user ? (
          <div className="auth-user">
            <span>{user.email}</span>
            <button
              className="auth-header-button"
              type="button"
              onClick={async () => {
                setActionError('')
                try {
                  await signOut()
                  setAuthMode(null)
                } catch (error) {
                  setActionError(
                    error instanceof Error
                      ? error.message
                      : 'Impossible de se déconnecter.',
                  )
                }
              }}
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <button
            className="auth-header-button"
            type="button"
            onClick={() => {
              setAuthMessage('')
              setAuthMode('signin')
            }}
          >
            Se connecter / S'inscrire
          </button>
        )}
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">LE CATALOGUE</p>
        <h1 id="page-title">Trouvez votre prochain favori.</h1>
        <p className="intro-copy">
          Découvrez une sélection de produits chargés depuis une API.
        </p>
      </section>

      {authMode ? (
        <AuthForm
          mode={authMode}
          message={authMessage}
          onModeChange={setAuthMode}
          onBack={() => setAuthMode(null)}
          onMessage={setAuthMessage}
        />
      ) : (
      <section className="catalog" aria-label="Catalogue de produits">
        {authMessage && (
          <p className="action-message action-success" role="status">
            {authMessage}
          </p>
        )}
        <div className="toolbar">
          <label className="search-box">
            <span className="visually-hidden">Rechercher un produit</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="category-select">
            <span className="visually-hidden">Filtrer par catégorie</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="results-heading">
          <h2>Nos produits</h2>
          <div className="results-actions">
            {status === 'success' && (
              <p>
                {visibleProducts.length}{' '}
                {visibleProducts.length > 1 ? 'produits' : 'produit'}
              </p>
            )}
            <button
              className="retry-button add-button"
              type="button"
              onClick={() => {
                setActionError('')
                if (user) {
                  setIsCreating(true)
                } else {
                  setAuthMode('signin')
                }
              }}
              disabled={authStatus !== 'ready'}
            >
              {user ? '+ Ajouter un produit' : 'Connecte-toi pour publier'}
            </button>
          </div>
        </div>

        {actionError && (
          <p className="action-message action-error" role="alert">
            {actionError}
          </p>
        )}
        {notice && (
          <p className="action-message action-success" role="status">
            {notice}{' '}
            <span>Enregistré dans Supabase.</span>
          </p>
        )}

        {status === 'loading' && (
          <div className="message-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Chargement des produits...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="message-panel error-panel" role="alert">
            <h3>Impossible de charger les produits</h3>
            <p>{errorMessage}</p>
            <button
              className="retry-button"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Réessayer
            </button>
          </div>
        )}

        {status === 'success' && visibleProducts.length === 0 && (
          <div className="message-panel">
            {products.length === 0 ? (
              <>
                <h3>Votre catalogue est vide</h3>
                <p>
                  Importez les produits de démonstration depuis DummyJSON pour
                  les gérer ensuite dans Supabase.
                </p>
                {user ? (
                  <button
                    className="retry-button import-button"
                    type="button"
                    onClick={importProducts}
                    disabled={importing}
                  >
                    {importing
                      ? 'Importation en cours...'
                      : 'Importer les produits depuis DummyJSON'}
                  </button>
                ) : (
                  <button
                    className="retry-button import-button"
                    type="button"
                    onClick={() => setAuthMode('signin')}
                  >
                    Connecte-toi pour ajouter des produits
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>Aucun produit trouvé</h3>
                <p>
                  Essayez une autre recherche ou choisissez une autre catégorie.
                </p>
              </>
            )}
          </div>
        )}

        {status === 'success' && visibleProducts.length > 0 && (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  {product.thumbnail ? (
                    <ProductImage
                      key={product.thumbnail}
                      className="product-image"
                      src={product.thumbnail}
                      alt={product.title}
                    />
                  ) : (
                    <div className="image-placeholder" aria-label="Aucune image">
                      Image non disponible
                    </div>
                  )}
                  <span className="category-badge">{product.category}</span>
                </div>
                <div className="product-info">
                  <div className="product-rating" aria-label={`Note ${product.rating} sur 5`}>
                    <span aria-hidden="true">★</span>
                    {product.rating.toFixed(1)}
                  </div>
                  <h3>{product.title}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <span className="product-price">
                      {formatPrice(product.price)}
                    </span>
                    <span className="stock-count">
                      {product.stock ?? 0} en stock
                    </span>
                  </div>
                  {user?.id === product.owner_id && (
                    <div className="card-actions">
                      <button
                        className="edit-button"
                        type="button"
                        onClick={() => {
                          setActionError('')
                          setFormProduct(product)
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteProduct(product)}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      <footer className="footer">
        Projet React · Supabase
      </footer>
      {(isCreating || formProduct) && (
        <ProductForm
          key={formProduct?.id ?? 'new'}
          product={formProduct}
          categories={categories}
          saving={saving}
          onCancel={() => {
            if (saving) return
            setIsCreating(false)
            setFormProduct(null)
          }}
          onSubmit={saveProduct}
        />
      )}
    </main>
  )
}

export default App
