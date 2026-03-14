export type CampusDocument = {
  title: string;
  summary: string;
  assetUrl: string;
};

export type CampusMapResource = {
  title: string;
  summary: string;
  assetUrl: string;
  externalMapLabel: string;
  externalMapUrl: string;
  locations: Array<{
    name: string;
    area: string;
    note?: string;
  }>;
};

export type CampusService = {
  slug: string;
  name: string;
  description: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hours?: string;
  priceAssetUrl?: string;
};

export type CampusContact = {
  name: string;
  department: string;
  role?: string;
  email?: string;
  phone?: string;
  office?: string;
  hours?: string;
};

export const campusCodeOfConduct: CampusDocument = {
  title: "NU Student Code of Conduct",
  summary:
    "Official conduct guidance for respectful behavior, academic integrity, and safe campus participation.",
  assetUrl: "/campus/code-of-conduct.pdf",
};

export const campusMap: CampusMapResource = {
  title: "NU Campus Map",
  summary: "Core campus locations for classes, services, housing, and student support.",
  assetUrl: "/campus/campus-map.pdf",
  externalMapLabel: "Open external campus map",
  externalMapUrl: "https://www.google.com/maps/search/Nazarbayev+University",
  locations: [
    {
      name: "Main Academic Block",
      area: "Central campus",
      note: "Lecture halls, seminar rooms, and faculty offices.",
    },
    {
      name: "Library",
      area: "Academic zone",
      note: "Study spaces, printing points, and research support.",
    },
    {
      name: "Student Services Center",
      area: "Administrative zone",
      note: "Enrollment, student letters, and service requests.",
    },
    {
      name: "Sports Center",
      area: "Recreation zone",
      note: "Gym access, courts, and student activity facilities.",
    },
    {
      name: "Dormitory Offices",
      area: "Residential zone",
      note: "Housing support and residence guidance.",
    },
  ],
};

export const campusServices: CampusService[] = [
  {
    slug: "dormitory-accommodation",
    name: "Dormitory accommodation",
    description: "Housing support, move-in guidance, and residence-related fee references.",
    location: "Residence offices",
    contactName: "Dormitory Office",
    contactEmail: "housing@nu.edu.kz",
    contactPhone: "+7 (7172) 70 55 11",
    hours: "Mon-Fri, 09:00-18:00",
  },
  {
    slug: "laundry-services",
    name: "Laundry services",
    description: "Residential laundry points with pay-per-cycle usage.",
    location: "Residential buildings",
    contactName: "Dormitory Office",
    contactEmail: "housing@nu.edu.kz",
  },
  {
    slug: "sport-center-access",
    name: "Sports Center access",
    description: "Student access and pass options for gym and sports facilities.",
    location: "NU Sports Center",
    contactName: "Sports Center Front Desk",
    hours: "Daily, 08:00-22:00",
    priceAssetUrl: "/campus/services/sport-center-prices.jpg",
  },
  {
    slug: "printing-copying",
    name: "Printing and copying",
    description: "Printing support for study materials and coursework.",
    location: "Library and service points",
    contactName: "Library Service Desk",
  },
  {
    slug: "official-document-support",
    name: "Official document support",
    description: "Student letters, enrollment confirmations, and official document requests.",
    location: "Student Services Center",
    contactName: "Student Services Center",
    contactEmail: "studentservices@nu.edu.kz",
    contactPhone: "+7 (7172) 70 90 00",
    hours: "Mon-Fri, 09:00-18:00",
  },
];

export const importantContacts: CampusContact[] = [
  {
    name: "Health and Wellbeing Center",
    department: "Student wellbeing",
    email: "healthcenter@nu.edu.kz",
    phone: "+7 (7172) 70 66 88",
    office: "Campus clinic",
  },
  {
    name: "Counseling Support",
    department: "Student wellbeing",
    role: "Psychological support",
    email: "counseling@nu.edu.kz",
    office: "Wellbeing office",
  },
  {
    name: "Student Services Center",
    department: "Student affairs",
    email: "studentservices@nu.edu.kz",
    phone: "+7 (7172) 70 90 00",
    office: "Main administrative building",
  },
  {
    name: "Dormitory Office",
    department: "Residential life",
    email: "housing@nu.edu.kz",
    phone: "+7 (7172) 70 55 11",
    office: "Residence administration desk",
  },
  {
    name: "IT Help Desk",
    department: "Campus IT",
    email: "helpdesk@nu.edu.kz",
    phone: "+7 (7172) 70 50 50",
    hours: "Mon-Fri, 09:00-18:00",
  },
];

export function getCampusServiceBySlug(slug: string): CampusService | null {
  return campusServices.find((service) => service.slug === slug) ?? null;
}

export function getCampusServiceSlugs(): string[] {
  return campusServices.map((service) => service.slug);
}
