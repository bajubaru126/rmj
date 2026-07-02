export function TestBox() {
  console.log('🔥 TestBox RENDERED!');
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '200px',
        backgroundColor: '#ff0000',
        border: '10px solid #ffff00',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        padding: '20px',
        borderRadius: '20px',
        boxShadow: '0 0 50px rgba(255,0,0,0.8)'
      }}
    >
      🚨 TEST BOX - IF YOU SEE THIS, RENDERING WORKS! 🚨
    </div>
  );
}
