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
      "Others",
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
      "Others",
    ],
  },
  {
    name: "Family & Kids",
    subcategories: ["Toys", "Childcare", "School Supplies", "Maternity & Pregnancy", "Others"],
  },
  {
    name: "Fashion & Accessories",
    subcategories: ["Shoes", "Clothes", "Activewear", "Fashion Accessories", "Others"],
  },
  {
    name: "D.I.Y",
    subcategories: ["Others"],
  },
  {
    name: "Garden",
    subcategories: ["Garden", "Garden Furniture", "Tools", "Others"],
  },
  {
    name: "Travel",
    subcategories: ["Days Out", "Flights", "Hotel", "Trains & Buses", "Others"],
  },
  {
    name: "Culture & Leisure",
    subcategories: ["4K Blu-ray", "Blu-ray", "Cinema", "Music", "Vinyl", "Others"],
  },
  {
    name: "Groceries",
    subcategories: ["Others"],
  },
  {
    name: "Services & Contracts",
    subcategories: [
      "Services and Subscriptions",
      "Streaming",
      "Takeaway and Food Delivery",
      "Video Streaming",
      "Others",
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
      "Others",
    ],
  },
  {
    name: "Sports & Outdoors",
    subcategories: ["Bike", "Fitness & Running", "Protein", "Sports Nutrition", "Tent", "Others"],
  },
  {
    name: "Gaming",
    subcategories: ["Console", "Accessories", "Others"],
  },
  {
    name: "Car & Motorcycle",
    subcategories: ["Car Accessories", "Car Parts", "Garage & Service", "Tyres", "Vehicles", "Others"],
  },
  {
    name: "Finance & Insurance",
    subcategories: ["Others"],
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
      "Others",
    ],
  },
  {
    name: "Others",
    subcategories: ["Others"],
  },
];

export const categoryOptions = dealCategories.map((category) => ({
  value: category.name,
  label: category.name,
}));

export function getCategoryByName(name: string) {
  return dealCategories.find((category) => category.name === name);
}
