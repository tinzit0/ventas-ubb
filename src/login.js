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
  const [cargandoReset, setCargandoReset] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    // Validación para correos institucionales UBB
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta registrada con este correo.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleOlvidastePassword = async () => {
    if (!email) {
      setError('Por favor, escribe tu correo arriba para enviarte el enlace de recuperación.');
      return;
    }

    setCargandoReset(true);
    setError('');
    setMensaje('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMensaje('¡Correo enviado! Revisa tu bandeja de entrada o SPAM para restablecer tu contraseña.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No existe ninguna cuenta registrada con este correo.');
      } else {
        setError('Error al enviar el correo: ' + err.message);
      }
    }
    setCargandoReset(false);
  };

  return (
    <div style={{ maxWidth: '380px', margin: '50px auto', padding: '25px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>{esRegistro ? 'Registrarse' : 'Iniciar Sesión'}</h2>
      
      {error && <p style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '8px', borderRadius: '4px', fontSize: '13px' }}>{error}</p>}
      {mensaje && <p style={{ color: '#155724', backgroundColor: '#d4edda', padding: '8px', borderRadius: '4px', fontSize: '13px' }}>{mensaje}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Correo Universitario:</label>
          <input 
            type="email" 
            placeholder="ejemplo@alumnos.ubiobio.cl" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Contraseña:</label>
          <input 
            type="password" 
            placeholder="******" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {esRegistro ? 'Crear Cuenta' : 'Ingresar'}
        </button>
      </form>

      {!esRegistro && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button 
            type="button" 
            onClick={handleOlvidastePassword}
            disabled={cargandoReset}
            style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}
          >
            {cargandoReset ? 'Enviando correo...' : '¿Olvidaste tu contraseña?'}
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
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