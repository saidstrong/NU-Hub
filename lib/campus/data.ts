export type ConductItem = {
  title: string;
  detail: string;
};

export type CampusMapInfo = {
  externalMapLabel: string;
  externalMapUrl: string;
  locations: Array<{
    name: string;
    area: string;
    note?: string;
  }>;
};

export type CampusService = {
  name: string;
  location?: string;
  price?: string;
  note?: string;
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

export const codeOfConductItems: ConductItem[] = [
  {
    title: "Respect and safety",
    detail: "Treat peers, faculty, and staff with respect. Harassment and discrimination are not acceptable.",
  },
  {
    title: "Academic integrity",
    detail: "Submit your own work and follow NU academic honesty and citation requirements.",
  },
  {
    title: "Campus responsibility",
    detail: "Use facilities responsibly, follow residence rules, and report unsafe situations promptly.",
  },
  {
    title: "Digital conduct",
    detail: "Use university systems ethically and avoid misuse of campus networks and digital resources.",
  },
];

export const campusMapInfo: CampusMapInfo = {
  externalMapLabel: "Open NU campus map",
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
      note: "Study spaces, research help, and printing points.",
    },
    {
      name: "Student Services Center",
      area: "Administrative zone",
      note: "Enrollment, official documents, and student support services.",
    },
    {
      name: "Sports Center",
      area: "Recreation zone",
      note: "Gym access, courts, and student activity facilities.",
    },
    {
      name: "Dormitory Offices",
      area: "Residential zone",
      note: "Housing support, room requests, and residence guidance.",
    },
  ],
};

export const campusServices: CampusService[] = [
  {
    name: "Dormitory accommodation",
    location: "Residence offices",
    price: "By residence plan",
    note: "Confirm current semester rates with housing staff.",
  },
  {
    name: "Laundry",
    location: "Residential buildings",
    price: "Pay-per-cycle",
    note: "Rates vary by machine type and residence.",
  },
  {
    name: "Sports Center access",
    location: "NU Sports Center",
    price: "Student pass or membership",
    note: "Check front desk for latest access rules.",
  },
  {
    name: "Printing and copying",
    location: "Library and service points",
    price: "Per page",
    note: "B/W and color rates may differ by location.",
  },
  {
    name: "Official document support",
    location: "Student Services Center",
    note: "Processing timelines vary by request type.",
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
