import { ReactNode, startTransition } from "react";
import { Link, LinkProps, useNavigate } from "react-router-dom";

// A custom Link component that uses startTransition for navigation
export const TransitionLink = ({ 
  children, 
  to, 
  onClick,
  ...rest 
}: LinkProps & { children: ReactNode }) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // If there's a custom onClick handler, call it
    if (onClick) {
      onClick(e);
    }
    
    // Use startTransition to wrap the navigation
    startTransition(() => {
      navigate(to);
    });
  };
  
  return (
    <Link to={to} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
};

// A hook for programmatic navigation with startTransition
export const useTransitionNavigate = () => {
  const navigate = useNavigate();
  
  return (to: string, options?: any) => {
    startTransition(() => {
      navigate(to, options);
    });
  };
};