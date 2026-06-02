import { Shield, Leaf, FlaskConical, Award, Users, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">من نحن</h1>
          <p className="text-white/80 max-w-3xl mx-auto text-lg leading-relaxed">
            ZITRON هي أول علامة تجارية للعناية بالبشرة أنشأها أطباء الجلدية،
            مستوحاة من الآليات البيولوجية للبشرة. نقدم حلولاً فعالة ونظيفة
            لجميع أنواع البشرة.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[var(--accent)] font-medium mb-4">قصتنا</p>
              <h2 className="text-3xl font-bold text-[var(--primary)] mb-6">
                أكثر من 30 عاماً من الخبرة في طب الجلدية
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                تأسست ZITRON على يد مجموعة من أطباء الجلدية المرموقين الذين أرادوا
                تقديم حلول علمية فعالة للعناية بالبشرة. منذ تأسيسها، التزمت العلامة
                التجارية بتطوير تركيبات مبتكرة تعتمد على أحدث الأبحاث العلمية.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                اليوم، تُباع منتجاتنا في أكثر من 40 دولة حول العالم، وتحظى بثقة
                الملايين من العملاء وأطباء الجلدية على حد سواء.
              </p>
              <p className="text-gray-600 leading-relaxed">
                نلتزم بأعلى معايير الجودة والسلامة، ونسعى دائماً لتقديم أفضل
                المنتجات التي تجمع بين الفعالية والرفاهية الحسية.
              </p>
            </div>
            <div className="aspect-square bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 rounded-3xl flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-6xl font-bold text-[var(--primary)] mb-2">30+</p>
                <p className="text-gray-600 font-medium">عاماً من الخبرة</p>
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-3xl font-bold text-[var(--primary)]">40+</p>
                    <p className="text-sm text-gray-500">دولة</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[var(--primary)]">50+</p>
                    <p className="text-sm text-gray-500">منتج</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[var(--primary)]">1M+</p>
                    <p className="text-sm text-gray-500">عميل سعيد</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[var(--primary)]">15+</p>
                    <p className="text-sm text-gray-500">طبيب جلدية</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scientific Committee */}
      <section id="science" className="bg-[var(--secondary)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[var(--accent)] font-medium mb-2">خبراؤنا</p>
            <h2 className="text-3xl font-bold text-[var(--primary)] mb-4">
              لجنتنا العلمية
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              فريق من أطباء الجلدية والباحثين المرموقين يشرفون على تطوير جميع
              تركيباتنا
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {scientists.map((s) => (
              <div key={s.name} className="bg-white rounded-2xl p-8 text-center card-hover">
                <div className="w-24 h-24 mx-auto mb-4 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                  <Users size={36} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-bold text-[var(--primary)] mb-1">{s.name}</h3>
                <p className="text-sm text-[var(--accent)] mb-3">{s.title}</p>
                <p className="text-gray-600 text-sm">{s.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section id="commitments" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[var(--accent)] font-medium mb-2">قيمنا</p>
            <h2 className="text-3xl font-bold text-[var(--primary)] mb-4">
              التزاماتنا
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {commitmentsList.map((c) => (
              <div key={c.title} className="flex gap-4">
                <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <c.icon size={24} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--primary)] mb-2">{c.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Banner */}
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-8">أرقام تتحدث عن نفسها</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-4xl font-bold text-[var(--accent)]">90%</p>
              <p className="text-white/70 mt-2 text-sm">رضا العملاء</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[var(--accent)]">0%</p>
              <p className="text-white/70 mt-2 text-sm">بارابين</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[var(--accent)]">100%</p>
              <p className="text-white/70 mt-2 text-sm">مختبر سريرياً</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[var(--accent)]">50+</p>
              <p className="text-white/70 mt-2 text-sm">براءة اختراع</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const scientists = [
  {
    name: "د. أحمد الراشد",
    title: "رئيس اللجنة العلمية",
    bio: "أكثر من 25 عاماً من الخبرة في طب الجلدية التجميلي والبحث العلمي.",
  },
  {
    name: "د. سارة المنصور",
    title: "مديرة الأبحاث",
    bio: "متخصصة في علم الأحياء الجزيئي للبشرة وتطوير التركيبات المبتكرة.",
  },
  {
    name: "د. خالد العتيبي",
    title: "استشاري أمراض جلدية",
    bio: "خبير في علاج الأمراض الجلدية المزمنة والحساسية الجلدية.",
  },
];

const commitmentsList = [
  {
    icon: Shield,
    title: "تركيبات آمنة",
    description: "جميع منتجاتنا خالية من البارابين والفينوكسي إيثانول والمواد المسببة للحساسية المعروفة.",
  },
  {
    icon: FlaskConical,
    title: "مختبرة سريرياً",
    description: "كل منتج يخضع لاختبارات سريرية صارمة تحت إشراف أطباء الجلدية لضمان الفعالية والسلامة.",
  },
  {
    icon: Leaf,
    title: "صديقة للبيئة",
    description: "نستخدم عبوات قابلة لإعادة التدوير ونسعى لتقليل بصمتنا البيئية في جميع مراحل الإنتاج.",
  },
  {
    icon: Award,
    title: "جودة فرنسية",
    description: "جميع منتجاتنا مصنعة في فرنسا وفقاً لأعلى معايير الجودة الأوروبية.",
  },
  {
    icon: Heart,
    title: "لم تُختبر على الحيوانات",
    description: "نلتزم بعدم اختبار أي من منتجاتنا على الحيوانات، ونستخدم بدائل أخلاقية.",
  },
  {
    icon: Users,
    title: "للجميع",
    description: "منتجاتنا مصممة لتناسب جميع أنواع البشرة وجميع الأعمار، من الأطفال إلى كبار السن.",
  },
];
