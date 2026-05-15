export interface DealCategory {
  name: string;
  subcategories: string[];
}

export const dealCategories: DealCategory[] = [
  {
    name: "Home & Living",
    subcategories: [
      "Furniture",
      "Lighting",
      "Kitchen Appliances",
      "Home Accessories",
      "Home Appliances",
      "Stationery & Office Supplies",
    ],
  },
  {
    name: "Electronics",
    subcategories: [
      "Smart Home",
      "Wearable",
      "Phones & Accessories",
      "Photo & Cameras",
      "Software & Apps",
      "Audio & Hi-Fi",
      "Electronic Accessories",
      "TV & Video",
      "Computers & Tablets",
    ],
  },
  {
    name: "Family & Kids",
    subcategories: ["Toys", "Childcare", "School Supplies", "Maternity & Pregnancy"],
  },
  {
    name: "Fashion & Accessories",
    subcategories: ["Shoes", "Clothes", "Activewear", "Fashion Accessories"],
  },
  {
    name: "D.I.Y",
    subcategories: [],
  },
  {
    name: "Garden",
    subcategories: ["Garden", "Garden Furniture", "Tools"],
  },
  {
    name: "Travel",
    subcategories: ["Days Out", "Flights", "Hotel", "Trains & Buses"],
  },
  {
    name: "Culture & Leisure",
    subcategories: ["4K Blu-ray", "Blu-ray", "Cinema", "Music", "Vinyl"],
  },
  {
    name: "Groceries",
    subcategories: [],
  },
  {
    name: "Services & Contracts",
    subcategories: [
      "Services and Subscriptions",
      "Streaming",
      "Takeaway and Food Delivery",
      "Video Streaming",
    ],
  },
  {
    name: "Health & Beauty",
    subcategories: [
      "Electric Toothbrush",
      "Healthcare",
      "Makeup",
      "Men's Fragrance",
      "Perfume",
    ],
  },
  {
    name: "Sports & Outdoors",
    subcategories: ["Bike", "Fitness & Running", "Protein", "Sports Nutrition", "Tent"],
  },
  {
    name: "Gaming",
    subcategories: ["Console", "Accessories"],
  },
  {
    name: "Car & Motorcycle",
    subcategories: ["Car Accessories", "Car Parts", "Garage & Service", "Tyres", "Vehicles"],
  },
  {
    name: "Finance & Insurance",
    subcategories: [],
  },
  {
    name: "Freebies",
    subcategories: [
      "Free Apps",
      "Free Books",
      "Free Events",
      "Free Food and Drink",
      "Free Online Courses",
      "Free Trials and Subscriptions",
      "Free Video Games",
    ],
  },
];

export const categoryOptions = dealCategories.map((category) => ({
  value: category.name,
  label: category.name,
}));

export function getCategoryByName(name: string) {
  return dealCategories.find((category) => category.name === name);
}
