import { Link } from 'react-router-dom';

function Header() {
  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logo}>
        ⚡ FlashHook
      </Link>
    </header>
  );
}

const styles = {
  header: {
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'var(--accent)',
    textDecoration: 'none',
  }
};

export default Header;
