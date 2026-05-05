import { dealCategories } from "./categories";

type CategoryHint = {
  category: string;
  subCategory?: string;
  keywords: string[];
};

export interface DetectedCategory {
  category: string;
  subCategory: string;
  confidence: number;
  matchedKeyword: string;
}

const categoryHints: CategoryHint[] = [
  {
    category: "Electronics",
    subCategory: "Phones & Accessories",
    keywords: ["iphone", "samsung galaxy", "smartphone", "phone case", "powerbank", "charger", "usb-c"],
  },
  {
    category: "Electronics",
    subCategory: "Computers & Tablets",
    keywords: ["laptop", "macbook", "ipad", "tablet", "monitor", "keyboard", "mouse", "ssd", "ram", "printer"],
  },
  {
    category: "Electronics",
    subCategory: "Audio & Hi-Fi",
    keywords: ["earbuds", "headphone", "speaker", "soundbar", "airpods", "sony wh", "jbl"],
  },
  {
    category: "Electronics",
    subCategory: "TV & Video",
    keywords: ["tv", "television", "oled", "qled", "projector", "chromecast", "android tv"],
  },
  {
    category: "Gaming",
    subCategory: "Console",
    keywords: ["playstation", "ps5", "xbox", "nintendo switch", "steam deck", "console"],
  },
  {
    category: "Gaming",
    subCategory: "Accessories",
    keywords: ["gaming headset", "controller", "gamepad", "mechanical keyboard", "gaming mouse"],
  },
  {
    category: "Fashion & Accessories",
    subCategory: "Shoes",
    keywords: ["sneaker", "shoe", "trainer", "sandal", "boots", "nike", "adidas", "puma"],
  },
  {
    category: "Fashion & Accessories",
    subCategory: "Clothes",
    keywords: ["shirt", "t-shirt", "jeans", "dress", "jacket", "hoodie", "pants", "uniqlo", "zalora"],
  },
  {
    category: "Fashion & Accessories",
    subCategory: "Fashion Accessories",
    keywords: ["watch", "bag", "wallet", "sunglasses", "cap", "belt"],
  },
  {
    category: "Health & Beauty",
    subCategory: "Makeup",
    keywords: ["makeup", "lipstick", "foundation", "mascara", "eyeliner", "blush"],
  },
  {
    category: "Health & Beauty",
    subCategory: "Perfume",
    keywords: ["perfume", "fragrance", "cologne", "eau de parfum"],
  },
  {
    category: "Health & Beauty",
    subCategory: "Healthcare",
    keywords: ["skincare", "serum", "sunscreen", "moisturizer", "vitamin", "supplement"],
  },
  {
    category: "Groceries",
    keywords: ["grocery", "milk", "rice", "snack", "coffee", "tea", "detergent", "diaper", "supermarket"],
  },
  {
    category: "Home & Living",
    subCategory: "Kitchen Appliances",
    keywords: ["air fryer", "rice cooker", "blender", "microwave", "kettle", "oven", "coffee machine"],
  },
  {
    category: "Home & Living",
    subCategory: "Furniture",
    keywords: ["sofa", "chair", "desk", "table", "mattress", "wardrobe", "shelf"],
  },
  {
    category: "Travel",
    subCategory: "Flights",
    keywords: ["flight", "airasia", "malaysia airlines", "batik air", "ticket"],
  },
  {
    category: "Travel",
    subCategory: "Hotel",
    keywords: ["hotel", "resort", "staycation", "booking.com", "agoda"],
  },
  {
    category: "Services & Contracts",
    subCategory: "Streaming",
    keywords: ["netflix", "spotify", "disney+", "subscription", "prime video", "youtube premium"],
  },
  {
    category: "Sports & Outdoors",
    subCategory: "Fitness & Running",
    keywords: ["running", "treadmill", "dumbbell", "yoga", "fitness", "gym", "sports shoe"],
  },
  {
    category: "Car & Motorcycle",
    subCategory: "Car Accessories",
    keywords: ["dashcam", "car mat", "tyre", "engine oil", "car charger", "motorcycle"],
  },
  {
    category: "Freebies",
    keywords: ["free", "freebie", "giveaway", "trial", "no cost"],
  },
];

const validCategories = new Set(dealCategories.map((category) => category.name));

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, " ");
}

export function detectDealCategory(parts: string[]): DetectedCategory | null {
  const haystack = normalize(parts.filter(Boolean).join(" "));
  if (!haystack.trim()) {
    return null;
  }

  let best: DetectedCategory | null = null;

  for (const hint of categoryHints) {
    if (!validCategories.has(hint.category)) {
      continue;
    }

    for (const keyword of hint.keywords) {
      const normalizedKeyword = normalize(keyword).trim();
      if (!normalizedKeyword || !haystack.includes(normalizedKeyword)) {
        continue;
      }

      const confidence = normalizedKeyword.length + (hint.subCategory ? 8 : 0);
      if (!best || confidence > best.confidence) {
        best = {
          category: hint.category,
          subCategory: hint.subCategory ?? "",
          confidence,
          matchedKeyword: keyword,
        };
      }
    }
  }

  return best;
}
