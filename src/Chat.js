import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

function Chat({ producto, user, volver }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const endRef = useRef(null);

  // Determinamos el destinatario de la conversación
  const esMiProducto = producto.vendedorUid === user.uid;
  const paraUid = esMiProducto ? '' : producto.vendedorUid;

  useEffect(() => {
    if (!producto || !user) return;

    // Obtener los mensajes del producto actual
    const q = query(
      collection(db, 'mensajes'),
      where('productoId', '==', producto.id),
      orderBy('creadoEn', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        docs.push({ id: docSnap.id, ...data });

        // Marcar como leído si el mensaje fue enviado para mí y aún no está leído
        if (data.paraUid === user.uid && !data.leido) {
          updateDoc(doc(db, 'mensajes', docSnap.id), { leido: true });
        }
      });
      setMensajes(docs);
    });

    return () => unsubscribe();
  }, [producto, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      await addDoc(collection(db, 'mensajes'), {
        productoId: producto.id,
        deUid: user.uid,
        deEmail: user.email,
        paraUid: paraUid || 'vendedor',
        texto: nuevoMensaje.trim(),
        leido: false,
        creadoEn: serverTimestamp()
      });
      setNuevoMensaje('');
    } catch (error) {
      alert('Error al enviar mensaje: ' + error.message);
    }
  };

  const handleEliminarChat = async () => {
    const confirmar = window.confirm('¿Estás seguro de que deseas eliminar todo el historial de conversación de este producto?');
    if (!confirmar) return;

    try {
      const q = query(
        collection(db, 'mensajes'),
        where('productoId', '==', producto.id)
      );
      const snapshot = await getDocs(q);
      
      const batchPromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'mensajes', docSnap.id)));
      await Promise.all(batchPromises);

      alert('Chat eliminado con éxito.');
      volver();
    } catch (error) {
      alert('Error al eliminar chat: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif' }}>
      {/* Encabezado del Chat con Botón Borrar Chat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '10px', marginBottom: '15px' }}>
        <div>
          <button onClick={volver} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
            ❮ Volver
          </button>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{producto.titulo}</span>
        </div>

        <button 
          onClick={handleEliminarChat}
          style={{ padding: '6px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >
          🗑️ Eliminar Chat
        </button>
      </div>

      {/* Contenedor de Mensajes */}
      <div style={{ height: '350px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '8px', padding: '12px', backgroundColor: '#f9f9f9', marginBottom: '15px' }}>
        {mensajes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '140px', fontSize: '13px' }}>Inicia la conversación preguntando por este producto...</p>
        ) : (
          mensajes.map((m) => {
            const esMio = m.deUid === user.uid;
            return (
              <div 
                key={m.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: esMio ? 'flex-end' : 'flex-start', 
                  marginBottom: '10px' 
                }}
              >
                <span style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                  {m.deEmail ? m.deEmail.split('@')[0] : 'Usuario'}
                </span>
                <div style={{ 
                  backgroundColor: esMio ? '#0056b3' : '#e9ecef', 
                  color: esMio ? 'white' : 'black', 
                  padding: '8px 12px', 
                  borderRadius: '12px', 
                  maxWidth: '75%', 
                  wordBreak: 'break-word',
                  fontSize: '14px'
                }}>
                  {m.texto}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input para enviar mensaje */}
      <form onSubmit={handleEnviar} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          placeholder="Escribe tu mensaje..." 
          value={nuevoMensaje} 
          onChange={(e) => setNuevoMensaje(e.target.value)} 
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Chat;