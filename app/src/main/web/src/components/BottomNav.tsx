interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const navItems = [
  { route: 'today', label: '今日', icon: '📅' },
  { route: 'week', label: '周视图', icon: '📊' },
  { route: 'plan', label: '计划', icon: '🏋️' },
];

export function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  return (
    <nav class="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.route}
          class={`nav-item ${currentRoute === item.route ? 'active' : ''}`}
          onClick={() => onNavigate(item.route)}
        >
          <span style="font-size: 22px">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
