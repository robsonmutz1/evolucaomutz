import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Acesso à gestão · Evolução Mutz' },
    { name: 'description', content: 'Acesso protegido à gestão escolar da Evolução Mutz.' },
    { property: 'og:title', content: 'Acesso à gestão · Evolução Mutz' },
    { property: 'og:description', content: 'Área restrita de gestão escolar da Evolução Mutz.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  beforeLoad: () => { throw redirect({ to: '/dashboard' }); },
});