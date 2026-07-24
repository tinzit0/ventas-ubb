import React, { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación de correo institucional
    if (!email.endsWith('@alumnos.ubiobio.cl') && !email.endsWith('@ubiobio.cl')) {
      setError('Acceso restringido: Debes usar tu correo @alumnos.ubiobio.cl');
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Cuenta creada exitosamente');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Sesión iniciada correctamente');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2>{isRegistering ? 'Crear Cuenta UBB' : 'Iniciar Sesión'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Correo Universitario:</label>
          <input 
            type="email" 
            placeholder="usuario@alumnos.ubiobio.cl" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña:</label>
          <input 
            type="password" 
            placeholder="******" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isRegistering ? 'Registrarse' : 'Ingresar'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}

      <button 
        onClick={() => setIsRegistering(!isRegistering)} 
        style={{ marginTop: '15px', background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  );
}

export default Login;