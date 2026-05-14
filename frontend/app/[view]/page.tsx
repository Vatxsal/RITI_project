import DashboardFrame from '../../components/dashboard/DashboardFrame'

const routeViewMap: Record<string, string> = {
  water: 'water',
  health: 'health',
  agri: 'agri',
  dairy: 'dairy',
  edu: 'edu',
  employ: 'employ',
  women: 'women',
  welfare: 'welfare',
  infra: 'infra',
  tourism: 'tourism',
  env: 'env',
  reports: 'rpt',
  'ai-chat': 'ai'
}

export default function ViewPage({ params }: { params: { view: string } }) {
  return <DashboardFrame initialView={routeViewMap[params.view.toLowerCase()] || 'cmd'} />
}