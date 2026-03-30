import { createContext, useContext } from 'react';

export const SidebarCtx = createContext({
	sessionNav: null,
	setSessionNav: () => {},
	newSimOpen: false,
	setNewSimOpen: () => {},
});

export const useSidebar = () => useContext(SidebarCtx);
