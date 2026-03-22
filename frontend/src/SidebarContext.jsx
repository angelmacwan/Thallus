import { createContext, useContext } from 'react';

export const SidebarCtx = createContext({
	sessionNav: null,
	setSessionNav: () => {},
});

export const useSidebar = () => useContext(SidebarCtx);
