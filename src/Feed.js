import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import Chat from './Chat';

function Feed({ user }) {
  const [productos, setProductos] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Referencias para accionar la cámara y la galería
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const IMGBB_API_KEY = '2447ec54156a52c2b609cc1ea5d177d8';

  // DEFINICIÓN DE ADMINISTRADOR:
  const ES_ADMIN = user.email === 'martin.bustamante2201@alumnos.ubiobio.cl';

  const obtenerProductos = async () => {
    try {
      const q = query(collection(db, 'productos'), orderBy('creadoEn', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setProductos(docs);
    } catch (error) {
      console.error("Error al obtener productos: ", error);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const handleSeleccionarImagen = (file) => {
    if (file) {
      setArchivoImagen(file);
      setPreviewImagen(URL.createObjectURL(file));
    }
  };

  const limpiarImagen = () => {
    setArchivoImagen(null);
    setPreviewImagen(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handlePublicar = async (e) => {
    e.preventDefault();
    if (!titulo || !precio) return;

    setCargando(true);
    try {
      let imagenUrl = '';

      if (archivoImagen) {
        const formData = new FormData();
        formData.append('image', archivoImagen);

        const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });

        const datos = await respuesta.json();
        if (datos.success) {
          imagenUrl = datos.data.url;
        }
      }

      await addDoc(collection(db, 'productos'), {
        titulo,
        precio: Number(precio),
        descripcion,
        imagenUrl,
        vendedorEmail: user.email,
        vendedorUid: user.uid,
        creadoEn: serverTimestamp()
      });

      setTitulo('');
      setPrecio('');
      setDescripcion('');
      limpiarImagen();
      alert('¡Producto publicado con éxito!');
      obtenerProductos();
    } catch (error) {
      alert('Error al publicar: ' + error.message);
    }
    setCargando(false);
  };

  const handleEliminar = async (productoId) => {
    const mensajeConfirmacion = ES_ADMIN 
      ? '¿Modo Admin: Estás seguro de que deseas eliminar esta publicación?' 
      : '¿Estás seguro de que deseas eliminar tu publicación?';

    const confirmar = window.confirm(mensajeConfirmacion);
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, 'productos', productoId));
      alert('Publicación eliminada correctamente.');
      obtenerProductos();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  if (productoSeleccionado) {
    return (
      <Chat 
        producto={productoSeleccionado} 
        user={user} 
        volver={() => setProductoSeleccionado(null)} 
      />
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Barra superior con distintivo de Admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'inline-block', marginRight: '10px' }}>Mercado UBB</h2>
          {ES_ADMIN && (
            <span style={{ backgroundColor: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              Modo Admin Active
            </span>
          )}
        </div>
        <div>
          <span style={{ fontSize: '14px', marginRight: '10px' }}>{user.email}</span>
          <button onClick={() => auth.signOut()} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Formulario para publicar */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ddd' }}>
        <h3>Publicar un producto</h3>
        <form onSubmit={handlePublicar}>
          <input 
            type="text" 
            placeholder="¿Qué vendes? (ej: Libro Cálculo 1, Teclado, etc.)" 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <input 
            type="number" 
            placeholder="Precio en CLP ($)" 
            value={precio} 
            onChange={(e) => setPrecio(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <textarea 
            placeholder="Descripción corta o lugar de entrega en el campus..." 
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', height: '60px' }}
          />
          
          {/* Opciones para Adjuntar / Tomar Foto */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
              Foto del Producto:
            </label>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#0056b3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}
              >
                📷 Tomar Foto
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}
              >
                🖼️ Subir de Galería
              </button>
            </div>

            {/* Input oculto para la CÁMARA */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => handleSeleccionarImagen(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {/* Input oculto para la GALERÍA */}
            <input 
              type="file" 
              accept="image/*" 
              ref={galleryInputRef}
              onChange={(e) => handleSeleccionarImagen(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {/* Vista previa de la foto seleccionada */}
            {previewImagen && (
              <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                <img 
                  src={previewImagen} 
                  alt="Vista previa" 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                <button
                  type="button"
                  onClick={limpiarImagen}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <button type="submit" disabled={cargando} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
            {cargando ? 'Subiendo foto y publicando...' : 'Publicar'}
          </button>
        </form>
      </div>

      {/* Lista de Productos */}
      <h3>Productos Disponibles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
        {productos.map((prod) => {
          const esMiProducto = prod.vendedorUid === user.uid;
          const puedeEliminar = esMiProducto || ES_ADMIN;

          return (
            <div key={prod.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {prod.imagenUrl ? (
                  <img 
                    src={prod.imagenUrl} 
                    alt={prod.titulo} 
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '120px', backgroundColor: '#e9ecef', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>
                    Sin imagen
                  </div>
                )}
                <h4 style={{ margin: '0 0 10px 0' }}>{prod.titulo}</h4>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0056b3', margin: '0 0 10px 0' }}>
                  ${prod.precio ? prod.precio.toLocaleString('es-CL') : prod.precio}
                </p>
                <p style={{ fontSize: '14px', color: '#555', margin: '0 0 10px 0' }}>{prod.descripcion}</p>
                <p style={{ fontSize: '12px', color: '#888' }}>Vendedor: {prod.vendedorEmail ? prod.vendedorEmail.split('@')[0] : ''}</p>
              </div>
              
              <div>
                <button 
                  onClick={() => setProductoSeleccionado(prod)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
                >
                  Contactar / Chat
                </button>

                {puedeEliminar && (
                  <button 
                    onClick={() => handleEliminar(prod.id)}
                    style={{ 
                      width: '100%', 
                      padding: '6px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      marginTop: '5px', 
                      fontSize: '12px',
                      fontWeight: ES_ADMIN ? 'bold' : 'normal'
                    }}
                  >
                    {ES_ADMIN && !esMiProducto ? 'Eliminar (Como Admin)' : 'Eliminar publicación'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Feed;