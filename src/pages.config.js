/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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