import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaHome, FaMapMarkedAlt, FaGift, FaUser, FaSignOutAlt } from "react-icons/fa";
import logo from "../assets/FitTrack-1772946216051 (1)/FitTrack-logo-transparent.png";
import { useSelector, useDispatch } from "react-redux";
import { logout as logoutAction } from "../slices/authSlice";
import { logout as logoutApi } from "../services/authService";

export default function Sidebar({ onHoverChange }) {
  const user = useSelector((state) => state.auth?.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // best effort: ignore failures (session may already be cleared)
    }
    dispatch(logoutAction());
    navigate("/");
  };

  return (
    <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="group fixed left-0 top-0 h-screen bg-gray-900 text-white
                    w-20 hover:w-64 transition-all duration-300 flex flex-col"
    >

      {/* Logo */}
      <div className="flex items-center justify-center h-20 w-full">
        <img src={logo} alt="Logo" className=""/>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-2 flex-1">

        {/* Search */}
        <div className="flex items-center justify-center group-hover:justify-start 
                        gap-3 px-4 py-3 w-full hover:bg-gray-800 cursor-pointer transition-all hover:border-b-2 border-gray-400 ">
          
          <FaSearch className="text-gray-400 text-xl min-w-5" />

          <input
            type="text"
            placeholder="Search..."
            className="hidden group-hover:block bg-gray-800 text-white rounded-md px-2 py-1 text-sm w-full"
          />
        </div>

        {/* Home */}
        <Link
          to="/"
          className="flex items-center justify-center group-hover:justify-start
                     gap-3 px-4 py-3 hover:bg-gray-800 transition-all hover:border-b-2 border-gray-400"
        >
          <FaHome className="text-gray-400 text-xl min-w-5" />
          <span className="hidden group-hover:block">Home</span>
        </Link>

        {/* Map */}
        <Link
          to="/map"
          className="flex items-center justify-center group-hover:justify-start
                     gap-3 px-4 py-3 hover:bg-gray-800 transition-all hover:border-b-2 border-gray-400"
        >
          <FaMapMarkedAlt className="text-gray-400 text-xl min-w-5" />
          <span className="hidden group-hover:block">Map</span>
        </Link>

        {/* Rewards */}
        <Link
          to="/rewards"
          className="flex items-center justify-center group-hover:justify-start
                     gap-3 px-4 py-3 hover:bg-gray-800 transition-all hover:border-b-2 border-gray-400"
        >
          <FaGift className="text-gray-400 text-xl min-w-5" />
          <span className="hidden group-hover:block">Rewards</span>
        </Link>

        {/* Profile and login/SignUp*/}
        {user ?(
          <Link
            to="/profile"
            className="flex items-center justify-center group-hover:justify-start
                       gap-3 px-4 py-3 hover:bg-gray-800 transition-all hover:border-b-2 border-gray-400"
          >
            <FaUser className="text-gray-400 text-xl min-w-5" />
            <span className="hidden group-hover:block">Profile</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center group-hover:justify-start
                       gap-3 px-4 py-3 hover:bg-gray-800 transition-all hover:border-b-2 border-gray-400"
          >
            <FaUser className="text-gray-400 text-xl min-w-5" />
            <span className="hidden group-hover:block">Login/SignUp</span>
          </Link>
        )}


      </div>

      {user && (
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-all text-left text-gray-200"
          >
            <FaSignOutAlt className="text-xl" />
            <span className="hidden group-hover:block">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}