// Ensure this page is always dynamic
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui'
    }}>
      <h1>404 - Page Not Found</h1>
    </div>
  );
}
