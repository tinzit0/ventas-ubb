import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import Chat from './Chat';

function Feed({ user }) {
  const [productos, setProductos] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Soporte para múltiples imágenes
  const [archivosImagenes, setArchivosImagenes] = useState([]);
  const [previewsImagenes, setPreviewsImagenes] = useState([]);
  
  const [cargando, setCargando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

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

      // Subir cada foto seleccionada a ImgBB
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
        imagenesUrls, // Guardamos un array de URLs
        imagenUrl: imagenesUrls[0] || '', // Mantener compatibilidad con publicaciones antiguas
        vendedorEmail: user.email,
        vendedorUid: user.uid,
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
          
          {/* Opciones para Adjuntar / Tomar Fotos */}
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

            {/* Input oculto para CÁMARA */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => handleSeleccionarImagenes(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Input oculto para GALERÍA (Permite múltiple selección) */}
            <input 
              type="file" 
              accept="image/*" 
              multiple
              ref={galleryInputRef}
              onChange={(e) => handleSeleccionarImagenes(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Vista previa de las fotos seleccionadas */}
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

      {/* Lista de Productos */}
      <h3>Productos Disponibles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
        {productos.map((prod) => {
          const esMiProducto = prod.vendedorUid === user.uid;
          const puedeEliminar = esMiProducto || ES_ADMIN;

          // Normalizar fotos (apoyo a publicaciones antiguas y nuevas)
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
              puedeEliminar={puedeEliminar} 
              onEliminar={handleEliminar}
              onChat={() => setProductoSeleccionado(prod)}
              onAbrirModal={(indice) => setModalGaleria({ abierto: true, fotos, indice })}
            />
          );
        })}
      </div>

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

// Componente para la Tarjeta de cada Producto con Slider Integrado
function TarjetaProducto({ prod, fotos, ES_ADMIN, puedeEliminar, onEliminar, onChat, onAbrirModal }) {
  const [indiceFoto, setIndiceFoto] = useState(0);

  const anteriorFoto = (e) => {
    e.stopPropagation();
    setIndiceFoto(prev => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  const siguienteFoto = (e) => {
    e.stopPropagation();
    setIndiceFoto(prev => (prev === fotos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {fotos.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#f0f0f0', borderRadius: '6px', marginBottom: '10px', overflow: 'hidden', cursor: 'pointer' }}>
            <img 
              src={fotos[indiceFoto]} 
              alt={prod.titulo} 
              onClick={() => onAbrirModal(indiceFoto)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />

            {/* Controles para cambiar de foto si hay más de 1 */}
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

        <h4 style={{ margin: '0 0 10px 0' }}>{prod.titulo}</h4>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0056b3', margin: '0 0 10px 0' }}>
          ${prod.precio ? prod.precio.toLocaleString('es-CL') : prod.precio}
        </p>
        <p style={{ fontSize: '14px', color: '#555', margin: '0 0 10px 0' }}>{prod.descripcion}</p>
        <p style={{ fontSize: '12px', color: '#888' }}>Vendedor: {prod.vendedorEmail ? prod.vendedorEmail.split('@')[0] : ''}</p>
      </div>
      
      <div>
        <button 
          onClick={onChat}
          style={{ width: '100%', padding: '8px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
        >
          Contactar / Chat
        </button>

        {puedeEliminar && (
          <button 
            onClick={() => onEliminar(prod.id)}
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
            {ES_ADMIN && !prod.esMiProducto ? 'Eliminar (Como Admin)' : 'Eliminar publicación'}
          </button>
        )}
      </div>
    </div>
  );
}

// Modal a Pantalla Completa para Expandir Fotos y Deslizar
function VisorFotosModal({ modalGaleria, setModalGaleria }) {
  const { fotos, indice } = modalGaleria;

  const cerrar = () => setModalGaleria({ abierto: false, fotos: [], indice: 0 });

  const anterior = () => {
    setModalGaleria(prev => ({
      ...prev,
      indice: prev.indice === 0 ? fotos.length - 1 : prev.indice - 1
    }));
  };

  const siguiente = () => {
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        flexDirection: 'column',
        padding: '20px'
      }}
      onClick={cerrar}
    >
      {/* Botón cerrar */}
      <button 
        onClick={cerrar}
        style={{
          position: 'absolute',
          top: '15px',
          right: '20px',
          color: 'white',
          backgroundColor: 'transparent',
          border: 'none',
          fontSize: '30px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        ✕
      </button>

      {/* Imagen ampliada */}
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <img 
          src={fotos[indice]} 
          alt="Ampliada" 
          style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} 
        />

        {/* Flechas de navegación si hay múltiples fotos */}
        {fotos.length > 1 && (
          <>
            <button 
              onClick={anterior}
              style={{ position: 'absolute', left: '-15px', top: '48%', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}
            >
              ❮
            </button>
            <button 
              onClick={siguiente}
              style={{ position: 'absolute', right: '-15px', top: '48%', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}
            >
              ❯
            </button>
          </>
        )}
      </div>

      {/* Indicador de número de foto */}
      {fotos.length > 1 && (
        <p style={{ color: 'white', marginTop: '15px', fontSize: '14px' }}>
          {indice + 1} de {fotos.length}
        </p>
      )}
    </div>
  );
}

export default Feed;