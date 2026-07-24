import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';

function Feed({ user }) {
  const [productos, setProductos] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);

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

  const handlePublicar = async (e) => {
    e.preventDefault();
    if (!titulo || !precio) return;

    setCargando(true);
    try {
      await addDoc(collection(db, 'productos'), {
        titulo,
        precio: Number(precio),
        descripcion,
        vendedorEmail: user.email,
        vendedorUid: user.uid,
        creadoEn: serverTimestamp()
      });

      setTitulo('');
      setPrecio('');
      setDescripcion('');
      alert('¡Producto publicado!');
      obtenerProductos();
    } catch (error) {
      alert('Error al publicar: ' + error.message);
    }
    setCargando(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
        <h2>Mercado UBB</h2>
        <div>
          <span style={{ fontSize: '14px', marginRight: '10px' }}>{user.email}</span>
          <button onClick={() => auth.signOut()} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

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
          <button type="submit" disabled={cargando} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {cargando ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>

      <h3>Productos Disponibles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
        {productos.map((prod) => (
          <div key={prod.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: 'white' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>{prod.titulo}</h4>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0056b3', margin: '0 0 10px 0' }}>
              ${prod.precio ? prod.precio.toLocaleString('es-CL') : prod.precio}
            </p>
            <p style={{ fontSize: '14px', color: '#555', margin: '0 0 10px 0' }}>{prod.descripcion}</p>
            <p style={{ fontSize: '12px', color: '#888' }}>Vendedor: {prod.vendedorEmail.split('@')[0]}</p>
            <button 
              onClick={() => alert(`Próximamente: Abrir chat con ${prod.vendedorEmail}`)}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
            >
              Contactar / Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Feed;