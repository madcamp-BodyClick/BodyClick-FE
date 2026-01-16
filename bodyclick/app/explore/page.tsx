import InfoPanel from "../../components/InfoPanel";
import Stage3D from "../../components/Stage3D";
import SystemLayerSelector from "../../components/SystemLayerSelector";

const ExplorePage = () => {
  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1400px] flex-col gap-8 px-5 pb-20 pt-6 lg:flex-row lg:items-stretch lg:gap-8 lg:px-10 lg:pt-24">
          <header className="flex items-center justify-between lg:absolute lg:left-10 lg:right-10 lg:top-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
                바디클릭
              </p>
              <p className="mt-2 text-sm text-bm-muted">3D 인체 탐색</p>
            </div>
            <p className="hidden text-xs text-bm-muted lg:block">
              의료 인사이트 인터페이스
            </p>
          </header>

          <div className="order-2 mt-4 flex items-center justify-center lg:order-1 lg:mt-0 lg:w-48 lg:items-start">
            <SystemLayerSelector />
          </div>

          <div className="order-1 flex flex-1 items-center justify-center lg:order-2 lg:mt-0">
            <Stage3D />
          </div>

          <div className="order-3">
            <InfoPanel />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ExplorePage;
