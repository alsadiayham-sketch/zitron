import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ranges = [
  {
    id: "sensidiane",
    name: "سنسيديان",
    nameEn: "SENSIDIANE",
    description: "مجموعة مخصصة للبشرة الحساسة والتفاعلية. تهدئ وتحمي وتقوي حاجز البشرة الطبيعي.",
    color: "from-pink-100 to-pink-50",
    products: 8,
  },
  {
    id: "exfoliac",
    name: "إكسفولياك",
    nameEn: "EXFOLIAC",
    description: "حلول متكاملة للبشرة المعرضة لحب الشباب والشوائب. تنقي وتصحح وتمنع ظهور العيوب.",
    color: "from-green-100 to-green-50",
    products: 12,
  },
  {
    id: "sunactive",
    name: "صن أكتيف",
    nameEn: "SUN ACTIVE",
    description: "حماية متقدمة من أشعة الشمس UVA و UVB. تركيبات خفيفة مناسبة لجميع أنواع البشرة.",
    color: "from-yellow-100 to-yellow-50",
    products: 6,
  },
  {
    id: "xerodiane",
    name: "زيروديان",
    nameEn: "XERODIANE",
    description: "ترطيب مكثف للبشرة الجافة جداً والأتوبية. تغذي وتعيد بناء حاجز الترطيب.",
    color: "from-blue-100 to-blue-50",
    products: 7,
  },
  {
    id: "norelift",
    name: "نوريليف",
    nameEn: "NORELIFT",
    description: "مكافحة الشيخوخة وعلامات التقدم في السن. تحفز إنتاج الكولاجين وتشد البشرة.",
    color: "from-purple-100 to-purple-50",
    products: 5,
  },
  {
    id: "trio-white",
    name: "تريو وايت",
    nameEn: "TRIO WHITE",
    description: "تفتيح البشرة وتوحيد لونها. تقلل التصبغات والبقع الداكنة بفعالية.",
    color: "from-amber-100 to-amber-50",
    products: 4,
  },
  {
    id: "hexaphane",
    name: "هيكسافان",
    nameEn: "HEXAPHANE",
    description: "العناية بالشعر وفروة الرأس. تقوي الشعر وتعالج مشاكل فروة الرأس.",
    color: "from-teal-100 to-teal-50",
    products: 5,
  },
  {
    id: "deoliane",
    name: "ديوليان",
    nameEn: "DEOLIANE",
    description: "مزيلات عرق فعالة وآمنة. حماية طويلة الأمد مع احترام البشرة الحساسة.",
    color: "from-indigo-100 to-indigo-50",
    products: 3,
  },
];

export default function RangesPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">مجموعاتنا</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            لكل مشكلة جلدية، مجموعة متخصصة من ZITRON مصممة لتلبية احتياجاتك
          </p>
        </div>
      </section>

      {/* Ranges Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ranges.map((range) => (
              <Link
                key={range.id}
                href={`/products?range=${range.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl overflow-hidden card-hover border border-gray-100">
                  <div className={`aspect-[16/9] bg-gradient-to-br ${range.color} flex items-center justify-center`}>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[var(--primary)]">{range.nameEn}</p>
                      <p className="text-sm text-[var(--primary)]/60 mt-1">{range.products} منتجات</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[var(--primary)] mb-2 group-hover:text-[var(--primary-light)] transition-colors">
                      {range.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {range.description}
                    </p>
                    <span className="text-[var(--primary)] font-medium text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                      اكتشف المجموعة
                      <ArrowLeft size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
