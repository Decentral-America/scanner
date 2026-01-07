import Address from './pages/Address';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminNodeRegistrations from './pages/AdminNodeRegistrations';
import AdminPanel from './pages/AdminPanel';
import Asset from './pages/Asset';
import BlockDetail from './pages/BlockDetail';
import BlockFeed from './pages/BlockFeed';
import Blocks from './pages/Blocks';
import Dashboard from './pages/Dashboard';
import DexPairs from './pages/DexPairs';
import DistributionTool from './pages/DistributionTool';
import Home from './pages/Home';
import NetworkMap from './pages/NetworkMap';
import NetworkStatistics from './pages/NetworkStatistics';
import Node from './pages/Node';
import NodeRegistration from './pages/NodeRegistration';
import Peers from './pages/Peers';
import Sustainability from './pages/Sustainability';
import Transaction from './pages/Transaction';
import TransactionMap from './pages/TransactionMap';
import UnconfirmedTransactions from './pages/UnconfirmedTransactions';
import UserDashboard from './pages/UserDashboard';
import UserProfile from './pages/UserProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Address": Address,
    "AdminAnalytics": AdminAnalytics,
    "AdminNodeRegistrations": AdminNodeRegistrations,
    "AdminPanel": AdminPanel,
    "Asset": Asset,
    "BlockDetail": BlockDetail,
    "BlockFeed": BlockFeed,
    "Blocks": Blocks,
    "Dashboard": Dashboard,
    "DexPairs": DexPairs,
    "DistributionTool": DistributionTool,
    "Home": Home,
    "NetworkMap": NetworkMap,
    "NetworkStatistics": NetworkStatistics,
    "Node": Node,
    "NodeRegistration": NodeRegistration,
    "Peers": Peers,
    "Sustainability": Sustainability,
    "Transaction": Transaction,
    "TransactionMap": TransactionMap,
    "UnconfirmedTransactions": UnconfirmedTransactions,
    "UserDashboard": UserDashboard,
    "UserProfile": UserProfile,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};