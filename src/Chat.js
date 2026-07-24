import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

function Chat({ producto, user, volver }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // Generamos un ID de chat único usando el ID del producto y los involucrados
  const chatId = producto.id;

  useEffect(() => {
    // Escuchar mensajes en tiempo real con onSnapshot
    const q = query(
      collection(db, 'chats', chatId, 'mensajes'),
      orderBy('creadoEn', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMensajes(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'mensajes'), {
        texto: nuevoMensaje,
        remitenteEmail: user.email,
        remitenteUid: user.uid,
        creadoEn: serverTimestamp()
      });
      setNuevoMensaje('');
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: 'white' }}>
      {/* Encabezado del Chat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0 }}>{producto.titulo}</h3>
          <span style={{ fontSize: '13px', color: '#666' }}>Vendedor: {producto.vendedorEmail}</span>
        </div>
        <button onClick={volver} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Volver
        </button>
      </div>

      {/* Ventana de Mensajes */}
      <div style={{ height: '300px', overflowY: 'auto', padding: '10px', backgroundColor: '#f9f9f9', margin: '15px 0', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mensajes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '100px' }}>Inicia la conversación para coordinar la entrega...</p>
        ) : (
          mensajes.map((m) => {
            const esMio = m.remitenteUid === user.uid;
            return (
              <div key={m.id} style={{
                alignSelf: esMio ? 'flex-end' : 'flex-start',
                backgroundColor: esMio ? '#0056b3' : '#e9ecef',
                color: esMio ? 'white' : 'black',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '70%',
                wordBreak: 'break-word'
              }}>
                <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
                  {esMio ? 'Tú' : m.remitenteEmail.split('@')[0]}
                </div>
                {m.texto}
              </div>
            );
          })
        )}
      </div>

      {/* Formulario de envío */}
      <form onSubmit={handleEnviar} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Escribe un mensaje..." 
          value={nuevoMensaje} 
          onChange={(e) => setNuevoMensaje(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Chat;