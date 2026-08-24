import type { ClientWorkspace } from '../types/client';
import { newId } from './ids';

/** A complete workspace used only when the user explicitly loads demo data. */
export function createDemoWorkspace(): ClientWorkspace {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    status: 'proposal_sent',
    client: {
      name: 'Khushi Sharma',
      businessName: 'Glam by Khushi',
      email: 'khushi@glambykhushi.in',
      phone: '+91 98765 43210',
      address: 'Indiranagar\nBengaluru, Karnataka\nIndia',
    },
    project: {
      title: 'Brand website for Glam by Khushi',
      summary:
        'A responsive beauty studio website with service pages, booking CTAs, and WhatsApp enquiries.',
      description:
        'Glam by Khushi needs a polished website that presents the studio, services, pricing, portfolio, and enquiry options clearly.\n\nThe site will be built mobile-first, with fast loading pages, clear navigation, and calls to action for appointment enquiries through WhatsApp and contact forms.',
      techStack: ['React', 'Tailwind CSS', 'Vercel', 'WhatsApp enquiry flow'],
      startDate: '2026-09-01',
      deliveryDate: '2026-09-28',
    },
    scope: {
      included: [
        'Responsive homepage',
        'Services and pricing page',
        'Portfolio/gallery section',
        'About and contact sections',
        'WhatsApp enquiry button',
        'Basic SEO setup',
        'Vercel deployment',
      ],
      excluded: [
        'Logo design',
        'Professional photoshoot',
        'Paid ads setup',
        'Booking payment gateway',
        'Monthly maintenance',
      ],
    },
    pricing: {
      lineItems: [
        {
          id: newId(),
          description: 'Website design and frontend development',
          quantity: 1,
          unitPrice: 45000,
        },
        {
          id: newId(),
          description: 'Deployment, SEO basics, and handover',
          quantity: 1,
          unitPrice: 10000,
        },
      ],
      discount: 5000,
      advancePercent: 50,
      revisionsIncluded: 2,
      timeline: '4 weeks from receipt of advance',
      paymentMethod: 'UPI or bank transfer',
      paymentDetails: 'UPI: pranavv736@upi\nBank transfer details shared on request.',
      extraTerms: [
        'Client will provide final images and content before development starts.',
        'Additional pages or major design changes will be quoted separately.',
      ],
    },
    invoice: {
      number: 'INV-2026-001',
      issueDate: '2026-09-01',
      dueDate: '2026-09-07',
      amountReceived: 25000,
      notes: 'Thank you for choosing Pranav V for this project.',
    },
    handover: {
      completedOn: '2026-09-28',
      liveUrl: 'https://glambykhushi.in',
      repoUrl: 'https://github.com/pranavv1210/glam-by-khushi',
      hostingProvider: 'Vercel',
      domainRegistrar: 'GoDaddy',
      adminUrl: 'https://vercel.com/dashboard',
      credentialsNote:
        'Credentials were shared separately over WhatsApp. Passwords are not included in this document.',
      services: [
        {
          id: newId(),
          name: 'Vercel',
          purpose: 'Hosting and deployment',
          account: 'Client-owned account',
        },
        {
          id: newId(),
          name: 'GitHub',
          purpose: 'Source code repository',
          account: 'Pranav V workspace, transferred on request',
        },
      ],
      assets: [
        'Final deployed website',
        'Source code repository',
        'Deployment access',
        'Basic SEO setup',
        'Handover notes',
      ],
      supportWindowDays: 14,
      notes:
        'Client can request small text/image corrections during the support window. New features will be quoted separately.',
    },
    documentDates: {
      proposalDate: '2026-08-24',
      agreementDate: '2026-09-01',
    },
  };
}
