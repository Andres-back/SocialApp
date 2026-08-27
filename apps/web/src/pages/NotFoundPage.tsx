import { Link } from 'react-router-dom';
export function NotFoundPage() { return <div className="py-20 text-center"><p className="font-display text-7xl text-pine-200">404</p><h1 className="mt-3 text-2xl font-bold text-pine-900">No encontramos esta página</h1><Link className="btn-primary mt-7" to="/">Volver al inicio</Link></div>; }

