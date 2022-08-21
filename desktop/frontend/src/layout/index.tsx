import Navbar from './navbar';
import Footer from './footer';
import { Background } from '@/components/background';
import styles from './index.module.scss';

export default function Layout({ children }: any) {
  return (
    <div className={styles.container}>
      <Background />
      <div className={styles.content}>
        <Navbar />
        {children}
        <Footer />
      </div>
    </div>
  );
}
