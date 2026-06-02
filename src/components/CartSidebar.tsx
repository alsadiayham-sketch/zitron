"use client";

import { useCart } from "@/context/CartContext";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CartSidebar() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, totalItems, totalPrice, isCartOpen, setIsCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-[var(--primary)] flex items-center gap-2">
            <ShoppingBag size={22} />
            سلة التسوق ({totalItems})
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">سلة التسوق فارغة</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-4 text-[var(--primary)] font-medium hover:underline"
              >
                تابع التسوق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--primary)] font-medium">{item.range}</p>
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <p className="font-bold text-[var(--primary)] text-sm mt-1">
                      {item.price} ₪
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 bg-white border rounded-full flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 bg-white border rounded-full flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="mr-auto text-red-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">المجموع الفرعي</span>
              <span className="font-bold text-lg text-[var(--primary)]">{totalPrice} ₪</span>
            </div>
            {totalPrice >= 49 && (
              <p className="text-green-600 text-sm text-center">✓ مؤهل للشحن المجاني</p>
            )}
            <button
              onClick={() => {
                setIsCartOpen(false);
                router.push("/checkout");
              }}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium py-3 rounded-full transition-colors"
            >
              إتمام الطلب
            </button>
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-full text-center text-[var(--primary)] font-medium text-sm hover:underline"
            >
              متابعة التسوق
            </button>
          </div>
        )}
      </div>
    </>
  );
}
