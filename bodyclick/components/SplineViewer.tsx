const SplineViewer = () => {
  return (
    <div className="mt-4 aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        title="바디클릭 3D"
        src="https://my.spline.design/cybernetichuman-8VM8v7LCw7oUtrURFoDjorWq/"
        className="h-full w-full"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
};

export default SplineViewer;
