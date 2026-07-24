import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  where 
} from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import Chat from './Chat';

function Feed({ user }) {
  const [productos, setProductos] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  // Filtro de ocultar vendidos
  const [ocultarVendidos, setOcultarVendidos] = useState(false);

  // Soporte para múltiples imágenes
  const [archivosImagenes, setArchivosImagenes] = useState([]);
  const [previewsImagenes, setPreviewsImagenes] = useState([]);
  
  const [cargando, setCargando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Estado para la edición de producto (modal)
  const [productoAEditar, setProductoAEditar] = useState(null);

  // Contador de mensajes no leídos
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);

  // Estado para el menú desplegable de Mis Chats
  const [mostrarMenuChats, setMostrarMenuChats] = useState(false);
  const [misChatsProdIds, setMisChatsProdIds] = useState([]);

  // Estado para el visor / modal de fotos a pantalla completa
  const [modalGaleria, setModalGaleria] = useState({ abierto: false, fotos: [], indice: 0 });

  // Referencias para la cámara y la galería
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
      querySnapshot.forEach((docSnap) => {
        docs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setProductos(docs);
    } catch (error) {
      console.error("Error al obtener productos: ", error);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  // Listener para contar mensajes no leídos y detectar productos con chats activos
  useEffect(() => {
    if (!user) return;

    const qMensajesNoLeidos = query(
      collection(db, 'mensajes'),
      where('paraUid', '==', user.uid),
      where('leido', '==', false)
    );

    const unsubscribeNoLeidos = onSnapshot(qMensajesNoLeidos, (snapshot) => {
      setMensajesNoLeidos(snapshot.size);
    }, (error) => {
      console.log("Error consultando no leídos:", error.message);
    });

    const qMisMensajes = query(
      collection(db, 'mensajes'),
      where('paraUid', '==', user.uid)
    );

    const unsubscribeMisMensajes = onSnapshot(qMisMensajes, (snapshot) => {
      const prodIds = new Set();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.productoId) prodIds.add(data.productoId);
      });
      setMisChatsProdIds(Array.from(prodIds));
    }, (error) => {
      console.log("Error consultando mis chats:", error.message);
    });

    return () => {
      unsubscribeNoLeidos();
      unsubscribeMisMensajes();
    };
  }, [user]);

  const cambiarClave = async () => {
    const nuevaClave = window.prompt("Ingresa tu nueva contraseña (mínimo 6 caracteres):");
    if (!nuevaClave) return;
    if (nuevaClave.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      await updatePassword(auth.currentUser, nuevaClave);
      alert("¡Contraseña actualizada con éxito!");
    } catch (error) {
      alert("Error (si llevas mucho tiempo logueado, re-inicia sesión e inténtalo de nuevo): " + error.message);
    }
  };

  const handleSeleccionarImagenes = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    
    const nuevosArchivos = Array.from(filesList);
    const nuevasPreviews = nuevosArchivos.map(file => URL.createObjectURL(file));

    setArchivosImagenes(prev => [...prev, ...nuevosArchivos]);
    setPreviewsImagenes(prev => [...prev, ...nuevasPreviews]);
  };

  const eliminarImagenSeleccionada = (index) => {
    setArchivosImagenes(prev => prev.filter((_, i) => i !== index));
    setPreviewsImagenes(prev => prev.filter((_, i) => i !== index));
  };

  const limpiarFormulario = () => {
    setTitulo('');
    setPrecio('');
    setDescripcion('');
    setArchivosImagenes([]);
    setPreviewsImagenes([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handlePublicar = async (e) => {
    e.preventDefault();
    if (!titulo || !precio) return;

    setCargando(true);
    try {
      let imagenesUrls = [];

      if (archivosImagenes.length > 0) {
        for (const archivo of archivosImagenes) {
          const formData = new FormData();
          formData.append('image', archivo);

          const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
          });

          const datos = await respuesta.json();
          if (datos.success) {
            imagenesUrls.push(datos.data.url);
          }
        }
      }

      await addDoc(collection(db, 'productos'), {
        titulo,
        precio: Number(precio),
        descripcion,
        imagenesUrls,
        imagenUrl: imagenesUrls[0] || '',
        vendedorEmail: user.email,
        vendedorUid: user.uid,
        vendido: false,
        creadoEn: serverTimestamp()
      });

      limpiarFormulario();
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

  const handleToggleVendido = async (productoId, estadoActual) => {
    try {
      const productoRef = doc(db, 'productos', productoId);
      await updateDoc(productoRef, {
        vendido: !estadoActual
      });
      obtenerProductos();
    } catch (error) {
      alert('Error al cambiar el estado del producto: ' + error.message);
    }
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!productoAEditar) return;

    try {
      const productoRef = doc(db, 'productos', productoAEditar.id);
      await updateDoc(productoRef, {
        titulo: productoAEditar.titulo,
        precio: Number(productoAEditar.precio),
        descripcion: productoAEditar.descripcion
      });
      alert('¡Publicación actualizada con éxito!');
      setProductoAEditar(null);
      obtenerProductos();
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    }
  };

  // Filtrado de productos por búsqueda y por estado "ocultar vendidos"
  const productosFiltrados = productos.filter((p) => {
    const texto = (p.titulo + ' ' + (p.descripcion || '')).toLowerCase();
    const coincideTexto = texto.includes(busqueda.toLowerCase());
    const coincideEstado = ocultarVendidos ? p.vendido !== true : true;
    return coincideTexto && coincideEstado;
  });

  const productosConChats = productos.filter(p => misChatsProdIds.includes(p.id) || p.vendedorUid === user.uid);

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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif' }}>
      {/* Barra superior responsiva */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '2px solid #0056b3', paddingBottom: '12px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Mercado UBB</h2>
          {ES_ADMIN && (
            <span style={{ backgroundColor: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
              Modo Admin
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setMostrarMenuChats(!mostrarMenuChats)}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: '#0056b3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold'
              }}
            >
              💬 Mis Chats {mensajesNoLeidos > 0 && `(${mensajesNoLeidos})`} ▾
            </button>

            {mostrarMenuChats && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '5px',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                width: '280px',
                maxWidth: '85vw',
                maxHeight: '280px',
                overflowY: 'auto',
                zIndex: 1000
              }}>
                <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                  Selecciona una conversación:
                </div>
                {productosConChats.length > 0 ? (
                  productosConChats.map((prod) => (
                    <div 
                      key={prod.id}
                      onClick={() => {
                        setProductoSeleccionado(prod);
                        setMostrarMenuChats(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <strong style={{ color: '#0056b3' }}>{prod.titulo}</strong>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {prod.vendedorUid === user.uid ? 'Tu publicación' : `Vendedor: ${prod.vendedorEmail ? prod.vendedorEmail.split('@')[0] : ''}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    Aún no tienes conversaciones.
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={cambiarClave} 
              style={{ padding: '5px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              🔒 Clave
            </button>
            <button 
              onClick={() => auth.signOut()} 
              style={{ padding: '5px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >
              Cerrar Sesión
            </button>
          </div>

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
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
              Fotos del Producto (puedes agregar varias):
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

            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => handleSeleccionarImagenes(e.target.files)}
              style={{ display: 'none' }}
            />

            <input 
              type="file" 
              accept="image/*" 
              multiple
              ref={galleryInputRef}
              onChange={(e) => handleSeleccionarImagenes(e.target.files)}
              style={{ display: 'none' }}
            />

            {previewsImagenes.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '5px 0' }}>
                {previewsImagenes.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', minWidth: '90px', height: '90px' }}>
                    <img 
                      src={url} 
                      alt={`Preview ${idx}`} 
                      style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                    <button
                      type="button"
                      onClick={() => eliminarImagenSeleccionada(idx)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={cargando} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
            {cargando ? `Subiendo ${archivosImagenes.length} foto(s) y publicando...` : 'Publicar'}
          </button>
        </form>
      </div>

      {/* Lista de Productos con Buscador y Filtro Ocultar Vendidos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>Productos Disponibles</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Checkbox para Ocultar Vendidos */}
          <label style={{ fontSize: '13px', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#e9ecef', padding: '6px 10px', borderRadius: '15px' }}>
            <input 
              type="checkbox" 
              checked={ocultarVendidos} 
              onChange={(e) => setOcultarVendidos(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            👁️ Ocultar vendidos
          </label>

          <input 
            type="text" 
            placeholder="🔍 Buscar producto..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #ccc', minWidth: '160px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
        {productosFiltrados.map((prod) => {
          const esMiProducto = prod.vendedorUid === user.uid;
          const puedeModificar = esMiProducto || ES_ADMIN;

          const fotos = prod.imagenesUrls && prod.imagenesUrls.length > 0 
            ? prod.imagenesUrls 
            : (prod.imagenUrl ? [prod.imagenUrl] : []);

          return (
            <TarjetaProducto 
              key={prod.id} 
              prod={prod} 
              fotos={fotos} 
              user={user} 
              ES_ADMIN={ES_ADMIN} 
              puedeModificar={puedeModificar} 
              onEliminar={handleEliminar}
              onToggleVendido={handleToggleVendido}
              onEditar={(producto) => setProductoAEditar(producto)}
              onChat={() => setProductoSeleccionado(prod)}
              onAbrirModal={(indice) => setModalGaleria({ abierto: true, fotos, indice })}
            />
          );
        })}
      </div>

      {/* Modal de Edición de Producto */}
      {productoAEditar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', maxWidth: '450px', width: '100%', boxSizing: 'border-box' }}>
            <h3>✏️ Editar Publicación</h3>
            <form onSubmit={handleGuardarEdicion}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Título:</label>
                <input 
                  type="text" 
                  value={productoAEditar.titulo} 
                  onChange={(e) => setProductoAEditar({ ...productoAEditar, titulo: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Precio CLP ($):</label>
                <input 
                  type="number" 
                  value={productoAEditar.precio} 
                  onChange={(e) => setProductoAEditar({ ...productoAEditar, precio: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Descripción:</label>
                <textarea 
                  value={productoAEditar.descripcion} 
                  onChange={(e) => setProductoAEditar({ ...productoAEditar, descripcion: e.target.value })} 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', height: '70px', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Guardar
                </button>
                <button type="button" onClick={() => setProductoAEditar(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Visor de Fotos a Pantalla Completa */}
      {modalGaleria.abierto && (
        <VisorFotosModal 
          modalGaleria={modalGaleria} 
          setModalGaleria={setModalGaleria} 
        />
      )}
    </div>
  );
}

// Componente para la Tarjeta de cada Producto
function TarjetaProducto({ prod, fotos, ES_ADMIN, puedeModificar, onEliminar, onToggleVendido, onEditar, onChat, onAbrirModal }) {
  const [indiceFoto, setIndiceFoto] = useState(0);

  const anteriorFoto = (e) => {
    e.stopPropagation();
    setIndiceFoto(prev => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  const siguienteFoto = (e) => {
    e.stopPropagation();
    setIndiceFoto(prev => (prev === fotos.length - 1 ? 0 : prev + 1));
  };

  const estaVendido = prod.vendido === true;

  return (
    <div style={{ 
      border: estaVendido ? '1px solid #e0e0e0' : '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '15px', 
      backgroundColor: estaVendido ? '#fdfdfd' : 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      justify: 'space-between',
      opacity: estaVendido ? 0.85 : 1
    }}>
      <div>
        {fotos.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#f0f0f0', borderRadius: '6px', marginBottom: '10px', overflow: 'hidden', cursor: 'pointer' }}>
            <img 
              src={fotos[indiceFoto]} 
              alt={prod.titulo} 
              onClick={() => onAbrirModal(indiceFoto)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: estaVendido ? 'grayscale(30%)' : 'none' }} 
            />

            {estaVendido && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                🏷️ VENDIDO
              </div>
            )}

            {fotos.length > 1 && (
              <>
                <button 
                  onClick={anteriorFoto}
                  style={{ position: 'absolute', left: '5px', top: '42%', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ❮
                </button>
                <button 
                  onClick={siguienteFoto}
                  style={{ position: 'absolute', right: '5px', top: '42%', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ❯
                </button>
                <div style={{ position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center' }}>
                  {fotos.map((_, i) => (
                    <span 
                      key={i} 
                      style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === indiceFoto ? '#0056b3' : '#ccc', margin: '0 3px' }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ width: '100%', height: '120px', backgroundColor: '#e9ecef', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>
            Sin imagen
          </div>
        )}

        <h4 style={{ margin: '0 0 10px 0', textDecoration: estaVendido ? 'line-through' : 'none', color: estaVendido ? '#666' : '#000' }}>{prod.titulo}</h4>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: estaVendido ? '#6c757d' : '#0056b3', margin: '0 0 10px 0' }}>
          ${prod.precio ? prod.precio.toLocaleString('es-CL') : prod.precio}
        </p>
        <p style={{ fontSize: '14px', color: '#555', margin: '0 0 10px 0' }}>{prod.descripcion}</p>
        <p style={{ fontSize: '12px', color: '#888' }}>Vendedor: {prod.vendedorEmail ? prod.vendedorEmail.split('@')[0] : ''}</p>
      </div>
      
      <div>
        <button 
          onClick={onChat}
          disabled={estaVendido}
          style={{ 
            width: '100%', 
            padding: '8px', 
            backgroundColor: estaVendido ? '#6c757d' : '#0056b3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: estaVendido ? 'not-allowed' : 'pointer', 
            marginTop: '10px',
            fontWeight: 'bold'
          }}
        >
          {estaVendido ? 'Producto Vendido' : 'Contactar / Chat'}
        </button>

        {puedeModificar && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <button 
              onClick={() => onEditar(prod)}
              style={{ flex: 1, padding: '5px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              ✏️ Editar
            </button>
            <button 
              onClick={() => onToggleVendido(prod.id, estaVendido)}
              style={{ flex: 1, padding: '5px', backgroundColor: estaVendido ? '#28a745' : '#ffc107', color: estaVendido ? 'white' : '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              {estaVendido ? 'Reactivar' : 'Vendido'}
            </button>
            <button 
              onClick={() => onEliminar(prod.id)}
              style={{ flex: 1, padding: '5px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >
              Borrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal a Pantalla Completa Optimizado para Celulares
function VisorFotosModal({ modalGaleria, setModalGaleria }) {
  const { fotos, indice } = modalGaleria;

  const cerrar = () => setModalGaleria({ abierto: false, fotos: [], indice: 0 });

  const anterior = (e) => {
    e.stopPropagation();
    setModalGaleria(prev => ({
      ...prev,
      indice: prev.indice === 0 ? fotos.length - 1 : prev.indice - 1
    }));
  };

  const siguiente = (e) => {
    e.stopPropagation();
    setModalGaleria(prev => ({
      ...prev,
      indice: prev.indice === fotos.length - 1 ? 0 : prev.indice + 1
    }));
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }}
      onClick={cerrar}
    >
      <button 
        onClick={cerrar}
        style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          color: 'white',
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          fontSize: '22px',
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100
        }}
      >
        ✕
      </button>

      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '600px',
          maxHeight: '75vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={fotos[indice]} 
          alt="Ampliada" 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '75vh', 
            objectFit: 'contain', 
            borderRadius: '8px' 
          }} 
        />

        {fotos.length > 1 && (
          <>
            <button 
              onClick={anterior}
              style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                color: 'white', 
                border: '1px solid rgba(255, 255, 255, 0.4)', 
                borderRadius: '50%', 
                width: '44px', 
                height: '44px', 
                cursor: 'pointer', 
                fontSize: '20px', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2050
              }}
            >
              ❮
            </button>

            <button 
              onClick={siguiente}
              style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                color: 'white', 
                border: '1px solid rgba(255, 255, 255, 0.4)', 
                borderRadius: '50%', 
                width: '44px', 
                height: '44px', 
                cursor: 'pointer', 
                fontSize: '20px', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2050
              }}
            >
              ❯
            </button>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div style={{ color: 'white', marginTop: '15px', fontSize: '14px', fontWeight: 'bold' }}>
          {indice + 1} / {fotos.length}
        </div>
      )}
    </div>
  );
}

export default Feed;