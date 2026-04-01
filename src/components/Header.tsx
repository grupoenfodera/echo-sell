import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut } from 'lucide-react';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('svp-auth');
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[54px] bg-elevated border-b border-border flex items-center px-4 sm:px-6 no-print">
      <div className="flex items-center gap-2">
        <span className="font-heading font-bold text-lg text-foreground">SVP</span>
        <span className="text-[10px] font-ui font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-pill">
          MVP
        </span>
        <span className="text-xs text-muted-foreground font-body italic hidden sm:inline ml-1">
          by Thammy Manuella
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground font-ui text-xs gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>
    </header>
  );
};

export default Header;
