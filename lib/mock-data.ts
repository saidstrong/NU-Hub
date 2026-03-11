export type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  location: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
};

export type Person = {
  id: string;
  name: string;
  major: string;
  year: string;
  lookingFor: string;
  interests: string[];
};

export type Community = {
  id: string;
  name: string;
  description: string;
  members: string;
  joinType: string;
  tags: string[];
};

export const marketCategories = [
  "Textbooks",
  "Electronics",
  "Dorm",
  "Clothing",
  "Sports",
  "Other",
];

export const listingMocks: Listing[] = [
  {
    id: "1",
    title: "MATH161 Calculus Textbook (8th Ed.)",
    price: "8,500 KZT",
    category: "Textbooks",
    condition: "Used - clean",
    location: "Main Library Lobby",
  },
  {
    id: "2",
    title: "LED Desk Lamp",
    price: "4,500 KZT",
    category: "Dorm",
    condition: "Good",
    location: "Block 20 Dorm",
  },
  {
    id: "3",
    title: "TI-84 Plus Graphing Calculator",
    price: "19,000 KZT",
    category: "Electronics",
    condition: "Like new",
    location: "School of Sciences Atrium",
  },
  {
    id: "4",
    title: "NU Hoodie (Size M)",
    price: "9,500 KZT",
    category: "Clothing",
    condition: "Used",
    location: "Student Center",
  },
];

export const eventCategories = [
  "Workshops",
  "Clubs",
  "Career",
  "Sports",
  "Social",
];

export const eventMocks: EventItem[] = [
  {
    id: "1",
    title: "NU Startup Pitch Night",
    date: "Tue, Apr 16 · 19:00",
    location: "C3.200 Auditorium",
    category: "Career",
  },
  {
    id: "2",
    title: "Robotics Club Build Session",
    date: "Wed, Apr 17 · 18:30",
    location: "Engineering Lab 4",
    category: "Clubs",
  },
  {
    id: "3",
    title: "Dorm League Football Match",
    date: "Fri, Apr 19 · 20:00",
    location: "Athletics Field",
    category: "Sports",
  },
  {
    id: "4",
    title: "Data Science Fundamentals Workshop",
    date: "Sat, Apr 20 · 14:00",
    location: "Library Hall",
    category: "Workshops",
  },
];

export const peopleMocks: Person[] = [
  {
    id: "1",
    name: "Aruzhan S.",
    major: "Computer Science",
    year: "3rd year",
    lookingFor: "Project teammate",
    interests: ["AI", "Product", "Hackathons"],
  },
  {
    id: "2",
    name: "Madi T.",
    major: "Economics",
    year: "2nd year",
    lookingFor: "Study partner",
    interests: ["Case competitions", "Finance", "Analytics"],
  },
  {
    id: "3",
    name: "Dana R.",
    major: "Mechanical Engineering",
    year: "4th year",
    lookingFor: "Collaborators",
    interests: ["Robotics", "Prototyping", "Community projects"],
  },
];

export const communityMocks: Community[] = [
  {
    id: "1",
    name: "NU Product Circle",
    description: "Student circle for product thinking, startup practice, and peer feedback.",
    members: "84",
    joinType: "Request",
    tags: ["Startups", "Product", "Design"],
  },
  {
    id: "2",
    name: "CS Study Pods",
    description: "Small study groups for midterms, finals, and weekly accountability.",
    members: "126",
    joinType: "Open",
    tags: ["Study", "CS", "Peer support"],
  },
  {
    id: "3",
    name: "Run Club NU",
    description: "Campus run group with morning and evening sessions for all levels.",
    members: "58",
    joinType: "Open",
    tags: ["Fitness", "Social", "Health"],
  },
];

export const interestChips = [
  "AI",
  "Finance",
  "Design",
  "Startups",
  "Research",
  "Sports",
  "Music",
  "Volunteering",
  "Photography",
  "Debate",
  "Gaming",
  "Language exchange",
];

export const lookingForChips = [
  "Study partner",
  "Project teammate",
  "Startup circle",
  "Friends",
  "Club/community",
  "Events",
  "Collaborators",
];

export const settingsItems = [
  "Edit profile",
  "Notifications",
  "Privacy",
  "Help",
  "Logout",
];

export const notificationMocks = [
  "A new textbook listing matches your saved market filters.",
  "Robotics Club Build Session starts in 2 hours.",
  "You have 3 pending community requests.",
  "CS Study Pods accepted your request to join.",
];
