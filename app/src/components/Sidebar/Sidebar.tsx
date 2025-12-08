import { RouteSelect } from "./RouteSelect";

export const Sidebar = () => {
  return (
    <div>
      <div className="overflow-y-scroll sticky top-4 h-[calc(100vh-32px-48px)]">
        <RouteSelect />
      </div>
      <div className="sticky top-[calc(100vh-48px-16px)]">
        {/* Add logout or other footer components here */}
      </div>
    </div>
  );
};

