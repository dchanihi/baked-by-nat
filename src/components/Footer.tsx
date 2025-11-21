import { Instagram, Youtube } from 'lucide-react';
import { Button } from './ui/button';
import logo from '@/assets/baked-by-nat-logo.png';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <footer className="bg-secondary border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-xl font-display font-semibold text-primary-foreground">
            <img src={logo} alt="baked by nat logo" className="w-10 h-10 object-contain" />
            baked by nat
          </div>
          
          <p className="text-sm text-muted-foreground font-body">
            baked with love by nat ♡
          </p>
          
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-pink-soft hover:text-primary-foreground transition-colors"
              asChild
            >
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-pink-soft hover:text-primary-foreground transition-colors"
              asChild
            >
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </Button>
          </div>
          
          <Button
            variant="link"
            onClick={scrollToTop}
            className="text-sm text-muted-foreground hover:text-pink-accent"
          >
            back to top ↑
          </Button>
          
          <p className="text-xs text-muted-foreground font-body">
            © 2025 baked by nat. all rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
