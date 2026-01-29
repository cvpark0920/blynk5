
// Types
export type OrderStatus = 'pending' | 'cooking' | 'served' | 'paid' | 'cancelled';
export type TableStatus = 'empty' | 'ordering' | 'dining' | 'cleaning';

export interface Order {
  id: string;
  tableId: number;
  sessionId?: string; // 활성 세션 필터링을 위해 추가
  items: { name: string; quantity: number; price: number; unitPrice?: number; options?: Array<{ name: string; quantity: number; price: number }> }[];
  status: OrderStatus;
  timestamp: Date;
  type: 'order' | 'request';
  requestDetail?: string;
  totalAmount: number; // 주문 총액 추가
}

export interface Table {
  id: number; // tableNumber from backend
  tableId?: string; // UUID from backend
  currentSessionId?: string | null; // 활성 세션 ID (활성 세션 필터링을 위해 추가)
  floor: number;
  isActive: boolean;
  status: TableStatus;
  guests: number;
  capacity: number;
  totalAmount: number;
  orderTime?: Date;
  memo?: string;
  qrCodeUrl?: string; // 서브도메인 기반 QR 코드 URL
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
}

export interface MenuOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isSoldOut: boolean;
  optionGroups: MenuOptionGroup[];
}

export type WaitingStatus = 'waiting' | 'notified' | 'seated' | 'cancelled';

export interface WaitingEntry {
  id: string;
  name: string;
  phone: string;
  guests: number;
  status: WaitingStatus;
  timestamp: Date;
  note?: string;
}

// Initial Mock Data
// INITIAL_WAITING_LIST removed - waiting list data is now loaded from API

export type UserRole = 'owner' | 'manager' | 'kitchen' | 'hall' | 'staff'; // staff는 deprecated
export type StaffStatus = 'active' | 'inactive' | 'pending';

export interface Staff {
  id: string;
  name: string;
  email: string; // 구글 로그인 연동용
  role: UserRole;
  status: StaffStatus;
  phone?: string;
  joinedAt: Date;
  avatarUrl?: string;
}

// INITIAL_STAFF removed - staff data is now loaded from API

// INITIAL_TABLES removed - tables are now loaded from API
// INITIAL_ORDERS removed - orders are now loaded from API
// INITIAL_CATEGORIES removed - categories are now loaded from API

export const INITIAL_MENU: MenuItem[] = [
  // Main Dishes
  { 
    id: 'm1', 
    categoryId: 'cat-main', 
    name: 'Tomato Pasta', 
    price: 15000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=300&q=80',
    optionGroups: [
      {
        id: 'opt-spicy',
        name: 'Spiciness',
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'sp-1', name: 'Mild', price: 0 },
          { id: 'sp-2', name: 'Medium', price: 0 },
          { id: 'sp-3', name: 'Spicy', price: 0 },
        ]
      }
    ]
  },
  { 
    id: 'm2', 
    categoryId: 'cat-main', 
    name: 'Cream Risotto', 
    price: 16000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=300&q=80',
    optionGroups: [
       {
        id: 'opt-topping',
        name: 'Add Topping',
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: 'top-1', name: 'Bacon', price: 2000 },
          { id: 'top-2', name: 'Mushrooms', price: 1500 },
          { id: 'top-3', name: 'Extra Cheese', price: 1000 },
        ]
      }
    ]
  },
  { 
    id: 'm3', 
    categoryId: 'cat-main', 
    name: 'T-Bone Steak', 
    price: 45000, 
    isSoldOut: true,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76690b6d02f?auto=format&fit=crop&w=300&q=80',
    optionGroups: [
      {
        id: 'opt-doneness',
        name: 'Doneness',
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'dn-1', name: 'Rare', price: 0 },
          { id: 'dn-2', name: 'Medium', price: 0 },
          { id: 'dn-3', name: 'Well Done', price: 0 },
        ]
      },
      {
        id: 'opt-sides',
        name: 'Sides',
        minSelect: 1,
        maxSelect: 2,
        options: [
           { id: 'sd-1', name: 'Fries', price: 0 },
           { id: 'sd-2', name: 'Mashed Potato', price: 0 },
           { id: 'sd-3', name: 'Grilled Veggies', price: 0 },
        ]
      }
    ]
  },
  
  // Pizza
  {
    id: 'm-p1',
    categoryId: 'cat-pizza',
    name: 'Margherita',
    price: 18000,
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },
  {
    id: 'm-p2',
    categoryId: 'cat-pizza',
    name: 'Pepperoni',
    price: 20000,
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },

  // Appetizers
  { 
    id: 'm4', 
    categoryId: 'cat-app', 
    name: 'Caesar Salad', 
    price: 12000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },
  { 
    id: 'm5', 
    categoryId: 'cat-app', 
    name: 'Garlic Bread', 
    price: 6000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1619531040576-f3f45a868bc3?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },

  // Beverages
  { 
    id: 'm6', 
    categoryId: 'cat-bev', 
    name: 'Cola', 
    price: 3000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },
  { 
    id: 'm7', 
    categoryId: 'cat-bev', 
    name: 'Lemonade', 
    price: 5000, 
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },
  { 
    id: 'm8', 
    categoryId: 'cat-bev', 
    name: 'Draft Beer', 
    price: 6000, 
    isSoldOut: true,
    imageUrl: 'https://images.unsplash.com/photo-1618183479302-1e0aa7cfcc85?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  },

  // Dessert
  {
    id: 'm9',
    categoryId: 'cat-des',
    name: 'Tiramisu',
    price: 8000,
    isSoldOut: false,
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=300&q=80',
    optionGroups: []
  }
];
