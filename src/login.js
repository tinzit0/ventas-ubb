import React, { useState } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';

function Login() {
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    // Validación opcional para correos UBB
    if (!email.endsWith('@alumnos.ubiobio.cl') && !email.endsWith('@ubiobio.cl')) {
      setError('Debes ingresar con un correo institucional (@alumnos.ubiobio.cl o @ubiobio.cl)');
      return;
    }

    try {
      if (esRegistro) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOlvidastePassword = async () => {
    if (!email) {
      setError('Escribe tu correo arriba para enviarte el enlace de recuperación.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMensaje('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja o spam.');
      setError('');
    } catch (err) {
      setError('Error al enviar correo: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '350px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>{esRegistro ? 'Registrarse' : 'Iniciar Sesión'}</h2>
      
      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green', fontSize: '14px' }}>{mensaje}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '12px' }}>Correo Institucional:</label>
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
          <label style={{ fontSize: '12px' }}>Contraseña:</label>
          <input 
            type="password" 
            placeholder="******" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {esRegistro ? 'Crear Cuenta' : 'Ingresar'}
        </button>
      </form>

      {!esRegistro && (
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px' }}>
          <button 
            type="button" 
            onClick={handleOlvidastePassword}
            style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </p>
      )}

      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
        {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} {' '}
        <button 
          onClick={() => { setEsRegistro(!esRegistro); setError(''); setMensaje(''); }}
          style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
        >
          {esRegistro ? 'Inicia sesión' : 'Regístrate aquí'}
        </button>
      </p>
    </div>
  );
}

export default Login;