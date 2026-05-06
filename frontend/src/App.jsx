import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Camera,
  ClipboardList,
  Dumbbell,
  Eye,
  History,
  Image,
  ImagePlus,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  Plus,
  Save,
  Scale,
  ShieldCheck,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

import { apiRequest, resolveMediaUrl } from "./api";

const TOKEN_STORAGE_KEY = "gymmy_token";
const COACH_DRAFT_STORAGE_KEY = "gymmy_coach_focus_draft";
const COACH_DRAFT_UPDATE_EVENT = "gymmy_coach_draft_update";
const COACH_MESSAGES_STORAGE_KEY = "gymmy_coach_messages";
const COACH_ADVICE_STORAGE_KEY = "gymmy_coach_last_advice";
const LOG_WORKOUT_DRAFT_STORAGE_KEY = "gymmy_log_workout_draft";
const BODY_PROFILE_STORAGE_KEY = "gymmy_body_profile";
const CoachButtonContext = createContext(null);

function BodyweightScaleIcon({ size = 18, ...props }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.7 4.5h14.6c1.15 0 2.03.98 1.9 2.12l-1.18 10.74A3.5 3.5 0 0 1 16.54 20.5H7.46a3.5 3.5 0 0 1-3.48-3.14L2.8 6.62A1.92 1.92 0 0 1 4.7 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7 5.15 9.15 9.7c.27.57.84.93 1.47.93h2.76c.63 0 1.2-.36 1.47-.93L17 5.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9.05 4.95h5.9l-.5 3.05a1.2 1.2 0 0 1-1.18 1h-2.54a1.2 1.2 0 0 1-1.18-1l-.5-3.05Z"
        fill="currentColor"
        opacity="0.24"
      />
      <path
        d="M12 6.95v1.4M9.95 5.95l.28.82M14.05 5.95l-.28.82"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="m12 7.15 1.05 1.85h-2.1L12 7.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "log", label: "Log Workout", icon: Dumbbell },
  { id: "templates", label: "Templates", icon: ClipboardList },
  { id: "bodyweight", label: "Bodyweight", icon: BodyweightScaleIcon },
  { id: "nutrition", label: "Nutrition", icon: Utensils },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "workouts", label: "History", icon: History },
];

function getHashRoute() {
  const route = window.location.hash.replace(/^#\/?/, "");
  return route || "dashboard";
}

function useHashRoute() {
  const [route, setRoute] = useState(getHashRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getHashRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (nextRoute) => {
    window.location.hash = `/${nextRoute}`;
  };

  return [route, navigate];
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getTodayInputDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatNutritionNumber(value, unit = "") {
  const number = Number(value) || 0;
  const formatted = Number.isInteger(number) ? number : number.toFixed(1);
  return `${formatted}${unit}`;
}

function getEmptyBodyProfile() {
  return {
    age: "",
    height: "",
    gender: "",
  };
}

function readBodyProfile() {
  try {
    const savedProfile = JSON.parse(
      localStorage.getItem(BODY_PROFILE_STORAGE_KEY) || "null",
    );

    if (!savedProfile || typeof savedProfile !== "object") {
      return getEmptyBodyProfile();
    }

    const savedGender =
      savedProfile.gender === "Male" || savedProfile.gender === "Female"
        ? savedProfile.gender
        : "";

    return {
      age: typeof savedProfile.age === "string" ? savedProfile.age : "",
      height: typeof savedProfile.height === "string" ? savedProfile.height : "",
      gender: savedGender,
    };
  } catch {
    return getEmptyBodyProfile();
  }
}

function hasBodyProfile(profile) {
  return Boolean(profile.age || profile.height || profile.gender);
}

function formatBodyProfile(profile) {
  const parts = [];

  if (profile.age) {
    parts.push(`Age ${profile.age}`);
  }

  if (profile.height) {
    parts.push(`Height ${profile.height}`);
  }

  if (profile.gender) {
    parts.push(`Gender ${profile.gender}`);
  }

  return parts.join(" | ") || "Set age, height, and gender";
}

function buildDietTargetQuestion(profile, currentBodyweight) {
  const height = profile.height || "__";
  const age = profile.age || "__";
  const gender = profile.gender || "__";
  const bodyweight = currentBodyweight
    ? `${formatNutritionNumber(currentBodyweight)} lb`
    : "__ lb";

  return `What should my daily calories, protein, carbs, and fat targets be? My height is ${height}, age ${age}, gender ${gender}, current bodyweight ${bodyweight}, activity level __, and goal weight __ lb.`;
}

function setCoachDraft(value) {
  localStorage.setItem(COACH_DRAFT_STORAGE_KEY, value);
  window.dispatchEvent(new Event(COACH_DRAFT_UPDATE_EVENT));
}

function readCoachMessages() {
  try {
    const savedMessages = JSON.parse(
      localStorage.getItem(COACH_MESSAGES_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(savedMessages)) {
      return [];
    }

    return savedMessages
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim(),
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  } catch {
    return [];
  }
}

function readCoachAdvice() {
  try {
    return JSON.parse(localStorage.getItem(COACH_ADVICE_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function getWorkoutVolume(workout) {
  return workout.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (setTotal, set) => setTotal + set.reps * set.weight,
        0,
      ),
    0,
  );
}

function getUniqueExerciseNames(workouts) {
  return Array.from(
    new Set(
      workouts.flatMap((workout) =>
        workout.exercises.map((exercise) => exercise.name).filter(Boolean),
      ),
    ),
  );
}

function EmptyState({ icon: Icon, title, action }) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <span>{title}</span>
      {action}
    </div>
  );
}

function Notice({ type = "info", children }) {
  if (!children) {
    return null;
  }

  return <div className={`notice ${type}`}>{children}</div>;
}

function FullScreenLoader() {
  return (
    <div className="screen-loader">
      <Loader2 className="spin" size={28} />
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const updateForm = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isSignup) {
        await apiRequest("/signup", {
          method: "POST",
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
          },
        });
      }

      const tokenResponse = await apiRequest("/login", {
        method: "POST",
        body: {
          username: form.username,
          password: form.password,
        },
      });

      onAuth(tokenResponse.access_token);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-block">
          <div className="brand-mark">
            <Dumbbell size={24} />
          </div>
          <div>
            <p className="eyebrow">Gymmy</p>
            <h1>{isSignup ? "Create account" : "Welcome back"}</h1>
          </div>
        </div>

        <div className="segmented-control" aria-label="Auth mode">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Username
            <input
              autoComplete="username"
              name="username"
              onChange={updateForm}
              required
              type="text"
              value={form.username}
            />
          </label>

          {isSignup && (
            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                onChange={updateForm}
                required
                type="email"
                value={form.email}
              />
            </label>
          )}

          <label>
            Password
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              name="password"
              onChange={updateForm}
              required
              type="password"
              value={form.password}
            />
          </label>

          <Notice type="error">{error}</Notice>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            {isSignup ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AppShell({ children, currentPage, navigate, onLogout, user }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">
            <Dumbbell size={19} />
          </div>
          <div>
            <strong>Gymmy</strong>
            <span>{user?.username}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                className={isActive ? "active" : ""}
                key={item.id}
                onClick={() => navigate(item.id)}
                type="button"
              >
                <Icon size={23} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="logout-button" onClick={onLogout} type="button">
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

function PageHeader({ title, eyebrow, actions }) {
  const openCoach = useContext(CoachButtonContext);

  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {(actions || openCoach) && (
        <div className="header-actions">
          {actions}
          {openCoach && (
            <button
              className="secondary-button coach-header-button"
              onClick={openCoach}
              type="button"
            >
              <Brain size={18} />
              Coach
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function Dashboard({ token, navigate }) {
  const [workouts, setWorkouts] = useState([]);
  const [bodyweights, setBodyweights] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [prs, setPrs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [workoutData, bodyweightData, photoData] = await Promise.all([
          apiRequest("/workouts/", { token }),
          apiRequest("/bodyweight/", { token }),
          apiRequest("/progress-photos/", { token }),
        ]);

        const exerciseNames = getUniqueExerciseNames(workoutData).slice(0, 4);
        const prData = await Promise.all(
          exerciseNames.map((name) =>
            apiRequest(`/workouts/prs/${encodeURIComponent(name)}`, {
              token,
            }).catch(() => null),
          ),
        );

        if (isMounted) {
          setWorkouts(workoutData);
          setBodyweights(bodyweightData);
          setPhotos(photoData);
          setPrs(prData.filter(Boolean));
        }
      } catch (apiError) {
        if (isMounted) {
          setError(apiError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const currentBodyweight = bodyweights[bodyweights.length - 1];
  const recentWorkouts = workouts.slice(0, 4);
  const latestPhoto = photos[0];
  const totalVolume = recentWorkouts.reduce(
    (total, workout) => total + getWorkoutVolume(workout),
    0,
  );

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" />

      <Notice type="error">{error}</Notice>

      {isLoading ? (
        <FullScreenLoader />
      ) : (
        <div className="dashboard-grid">
          <section className="metric-card accent-workouts">
            <div className="card-icon">
              <Dumbbell size={20} />
            </div>
            <span>Recent workouts</span>
            <strong>{recentWorkouts.length}</strong>
          </section>

          <section className="metric-card accent-bodyweight">
            <div className="card-icon">
              <Scale size={20} />
            </div>
            <span>Current bodyweight</span>
            <strong>
              {currentBodyweight ? `${currentBodyweight.weight} lb` : "--"}
            </strong>
          </section>

          <section className="metric-card accent-volume">
            <div className="card-icon">
              <Activity size={20} />
            </div>
            <span>Recent volume</span>
            <strong>{Math.round(totalVolume).toLocaleString()} lb</strong>
          </section>

          <section className="panel span-2">
            <div className="panel-heading">
              <h2>Recent workouts</h2>
              <button
                className="text-button"
                onClick={() => navigate("workouts")}
                type="button"
              >
                View all
              </button>
            </div>

            {recentWorkouts.length === 0 ? (
              <EmptyState
                action={
                  <button
                    className="secondary-button"
                    onClick={() => navigate("log")}
                    type="button"
                  >
                    <Plus size={17} />
                    Log workout
                  </button>
                }
                icon={Dumbbell}
                title="No workouts yet"
              />
            ) : (
              <div className="compact-list">
                {recentWorkouts.map((workout) => (
                  <button
                    className="list-row"
                    key={workout.id}
                    onClick={() => navigate(`workouts/${workout.id}`)}
                    type="button"
                  >
                    <div>
                      <strong>{workout.name}</strong>
                      <span>{formatDate(workout.date)}</span>
                    </div>
                    <span>{workout.exercises.length} exercises</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Latest PR estimates</h2>
            </div>

            {prs.length === 0 ? (
              <EmptyState icon={LineChart} title="No estimates yet" />
            ) : (
              <div className="compact-list">
                {prs.map((pr) => (
                  <div className="list-row static" key={pr.exercise}>
                    <div>
                      <strong>{pr.exercise}</strong>
                      <span>
                        {pr.weight} lb x {pr.reps}
                      </span>
                    </div>
                    <strong>{pr.estimated_1rm} lb</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel span-2">
            <div className="panel-heading">
              <h2>Bodyweight trend</h2>
              <button
                className="text-button"
                onClick={() => navigate("bodyweight")}
                type="button"
              >
                Open chart
              </button>
            </div>
            <BodyweightChart logs={bodyweights} compact />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Latest photo</h2>
              <button
                className="text-button"
                onClick={() => navigate("photos")}
                type="button"
              >
                Timeline
              </button>
            </div>
            {latestPhoto ? (
              <div className="photo-preview">
                <img alt={latestPhoto.notes || "Progress"} src={resolveMediaUrl(latestPhoto.photo_url)} />
                <span>{formatDate(latestPhoto.date)}</span>
              </div>
            ) : (
              <EmptyState icon={Image} title="No photos yet" />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function CoachChatModal({ isOpen, onClose, token }) {
  const [focus, setFocus] = useState(
    () => localStorage.getItem(COACH_DRAFT_STORAGE_KEY) || "",
  );
  const [messages, setMessages] = useState(readCoachMessages);
  const [advice, setAdvice] = useState(readCoachAdvice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const saveMessages = (nextMessages) => {
    setMessages(nextMessages);
    localStorage.setItem(COACH_MESSAGES_STORAGE_KEY, JSON.stringify(nextMessages));
  };

  const saveAdvice = (nextAdvice) => {
    setAdvice(nextAdvice);

    if (nextAdvice) {
      localStorage.setItem(COACH_ADVICE_STORAGE_KEY, JSON.stringify(nextAdvice));
    } else {
      localStorage.removeItem(COACH_ADVICE_STORAGE_KEY);
    }
  };

  const updateFocus = (value) => {
    setFocus(value);

    if (value) {
      localStorage.setItem(COACH_DRAFT_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(COACH_DRAFT_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const syncDraft = () => {
      setFocus(localStorage.getItem(COACH_DRAFT_STORAGE_KEY) || "");
    };

    window.addEventListener(COACH_DRAFT_UPDATE_EVENT, syncDraft);
    return () => window.removeEventListener(COACH_DRAFT_UPDATE_EVENT, syncDraft);
  }, []);

  const requestAdvice = async (event) => {
    event.preventDefault();
    const question = focus.trim();

    if (!question) {
      setError("Type a question for Coach.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const userMessage = { role: "user", content: question };
      const nextMessages = [...messages, userMessage];
      const data = await apiRequest("/coach/", {
        method: "POST",
        token,
        body: {
          focus: question,
          messages: nextMessages.slice(-20),
        },
      });
      saveAdvice(data);
      saveMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.direct_answer,
        },
      ]);
      updateFocus("");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearConversation = () => {
    saveMessages([]);
    saveAdvice(null);
    setError("");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="coach-modal-backdrop" role="presentation">
      <section
        aria-label="Coach chat"
        className="coach-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="coach-modal-header">
          <div>
            <h2>
              <Brain size={18} />
              Coach Gymmy
            </h2>
          </div>
          <div className="header-actions">
            {messages.length > 0 && (
              <button className="text-button" onClick={clearConversation} type="button">
                Clear chat
              </button>
            )}
            <button
              className="icon-button"
              onClick={onClose}
              title="Close coach"
              type="button"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="coach-chat">
          {messages.map((message, index) => (
            <div
              className={`coach-message ${message.role}`}
              key={`${message.role}-${index}`}
            >
              <span>{message.role === "user" ? "You" : "Coach Gymmy"}</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        <form className="form-stack coach-modal-form" onSubmit={requestAdvice}>
          <label>
            Ask Coach
            <textarea
              onChange={(event) => updateFocus(event.target.value)}
              placeholder="Ask a question or add a follow-up..."
              value={focus}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Brain size={18} />}
            Ask coach
          </button>
        </form>
        <Notice type="error">{error}</Notice>

        {advice && (
          <section className="coach-disclaimer">
            <span>{advice.disclaimer}</span>
            <strong>{advice.model}</strong>
          </section>
        )}
      </section>
    </div>
  );
}

const newSet = () => ({ reps: "8", weight: "" });
const newExercise = () => ({ name: "", sets: [newSet()] });
const newWorkoutDraft = () => ({
  name: "Workout",
  notes: "",
  exercises: [newExercise()],
});

function readWorkoutDraft() {
  try {
    const savedDraft = localStorage.getItem(LOG_WORKOUT_DRAFT_STORAGE_KEY);

    if (!savedDraft) {
      return newWorkoutDraft();
    }

    const parsedDraft = JSON.parse(savedDraft);

    if (!parsedDraft || !Array.isArray(parsedDraft.exercises)) {
      return newWorkoutDraft();
    }

    const exercises = parsedDraft.exercises
      .filter(Boolean)
      .map((exercise) => ({
        name: typeof exercise.name === "string" ? exercise.name : "",
        sets:
          Array.isArray(exercise.sets) && exercise.sets.length > 0
            ? exercise.sets.filter(Boolean).map((set) => ({
                reps: set.reps === undefined || set.reps === null ? "8" : String(set.reps),
                weight:
                  set.weight === undefined || set.weight === null
                    ? ""
                    : String(set.weight),
              }))
            : [newSet()],
      }));

    return {
      name: typeof parsedDraft.name === "string" ? parsedDraft.name : "Workout",
      notes: typeof parsedDraft.notes === "string" ? parsedDraft.notes : "",
      exercises: exercises.length > 0 ? exercises : [newExercise()],
    };
  } catch {
    return newWorkoutDraft();
  }
}

function WorkoutLogger({ token }) {
  const [workout, setWorkout] = useState(readWorkoutDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateWorkoutDraft = (updater) => {
    setWorkout((current) => {
      const nextWorkout = typeof updater === "function" ? updater(current) : updater;
      localStorage.setItem(
        LOG_WORKOUT_DRAFT_STORAGE_KEY,
        JSON.stringify(nextWorkout),
      );
      return nextWorkout;
    });
  };

  const updateWorkout = (patch) => {
    updateWorkoutDraft((current) => ({ ...current, ...patch }));
  };

  const updateExercise = (exerciseIndex, patch) => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise,
      ),
    }));
  };

  const updateSet = (exerciseIndex, setIndex, patch) => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, innerIndex) =>
                innerIndex === setIndex ? { ...set, ...patch } : set,
              ),
            }
          : exercise,
      ),
    }));
  };

  const addExercise = () => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: [...current.exercises, newExercise()],
    }));
  };

  const removeExercise = (exerciseIndex) => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
    }));
  };

  const addSet = (exerciseIndex) => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: [...exercise.sets, newSet()] }
          : exercise,
      ),
    }));
  };

  const removeSet = (exerciseIndex, setIndex) => {
    updateWorkoutDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.filter((_, innerIndex) => innerIndex !== setIndex),
            }
          : exercise,
      ),
    }));
  };

  const buildPayload = () => {
    const exercises = workout.exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets
          .filter((set) => set.reps !== "" && set.weight !== "")
          .map((set, index) => ({
            reps: Number(set.reps),
            weight: Number(set.weight),
            set_number: index + 1,
          })),
      }))
      .filter((exercise) => exercise.name && exercise.sets.length > 0);

    return {
      name: workout.name.trim() || "Workout",
      notes: workout.notes.trim() || null,
      exercises,
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = buildPayload();

      if (payload.exercises.length === 0) {
        throw new Error("Add at least one exercise with one set.");
      }

      await apiRequest("/workouts/", {
        method: "POST",
        token,
        body: payload,
      });

      localStorage.removeItem(LOG_WORKOUT_DRAFT_STORAGE_KEY);
      setWorkout(newWorkoutDraft());
      setMessage("Workout saved.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Training" title="Log Workout" />
      <form className="workout-builder" onSubmit={submit}>
        <section className="panel">
          <div className="form-grid two">
            <label>
              Workout name
              <input
                onChange={(event) => updateWorkout({ name: event.target.value })}
                type="text"
                value={workout.name}
              />
            </label>
            <label>
              Notes
              <input
                onChange={(event) => updateWorkout({ notes: event.target.value })}
                type="text"
                value={workout.notes}
              />
            </label>
          </div>
        </section>

        <Notice type="success">{message}</Notice>
        <Notice type="error">{error}</Notice>

        {workout.exercises.map((exercise, exerciseIndex) => (
          <section className="panel exercise-builder" key={exerciseIndex}>
            <div className="builder-heading">
              <label>
                Exercise
                <input
                  onChange={(event) =>
                    updateExercise(exerciseIndex, { name: event.target.value })
                  }
                  placeholder="Bench Press"
                  type="text"
                  value={exercise.name}
                />
              </label>
              <button
                className="icon-button danger"
                disabled={workout.exercises.length === 1}
                onClick={() => removeExercise(exerciseIndex)}
                title="Remove exercise"
                type="button"
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="set-table">
              <div className="set-row set-header">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight</span>
                <span />
              </div>

              {exercise.sets.map((set, setIndex) => (
                <div className="set-row" key={setIndex}>
                  <span>{setIndex + 1}</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, {
                        reps: event.target.value,
                      })
                    }
                    type="number"
                    value={set.reps}
                  />
                  <input
                    min="0"
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, {
                        weight: event.target.value,
                      })
                    }
                    step="0.5"
                    type="number"
                    value={set.weight}
                  />
                  <button
                    className="icon-button danger"
                    disabled={exercise.sets.length === 1}
                    onClick={() => removeSet(exerciseIndex, setIndex)}
                    title="Remove set"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="secondary-button"
              onClick={() => addSet(exerciseIndex)}
              type="button"
            >
              <Plus size={17} />
              Add set
            </button>
          </section>
        ))}

        <div className="builder-actions">
          <button className="secondary-button" onClick={addExercise} type="button">
            <Plus size={17} />
            Add exercise
          </button>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Save workout
          </button>
        </div>
      </form>
    </>
  );
}

function WorkoutHistory({ selectedId, token, navigate }) {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkouts = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/workouts/", { token });
      setWorkouts(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, [token]);

  const selectedWorkout = workouts.find(
    (workout) => workout.id === Number(selectedId),
  );

  const deleteWorkout = async (workoutId) => {
    setError("");

    try {
      await apiRequest(`/workouts/${workoutId}`, {
        method: "DELETE",
        token,
      });
      if (Number(selectedId) === workoutId) {
        navigate("workouts");
      }
      await loadWorkouts();
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Training" title="Workout History" />
      <Notice type="error">{error}</Notice>

      {isLoading ? (
        <FullScreenLoader />
      ) : workouts.length === 0 ? (
        <EmptyState
          action={
            <button
              className="secondary-button"
              onClick={() => navigate("log")}
              type="button"
            >
              <Plus size={17} />
              Log workout
            </button>
          }
          icon={History}
          title="No workouts logged"
        />
      ) : (
        <div className="history-layout">
          <section className="panel">
            <div className="compact-list">
              {workouts.map((workout) => (
                <div
                  className={
                    Number(selectedId) === workout.id
                      ? "list-row selected"
                      : "list-row"
                  }
                  key={workout.id}
                >
                  <button
                    className="row-button"
                    onClick={() => navigate(`workouts/${workout.id}`)}
                    type="button"
                  >
                    <strong>{workout.name}</strong>
                    <span>{formatDate(workout.date)}</span>
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => deleteWorkout(workout.id)}
                    title="Delete workout"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <WorkoutDetail workout={selectedWorkout} />
        </div>
      )}
    </>
  );
}

function WorkoutDetail({ workout }) {
  if (!workout) {
    return (
      <section className="panel detail-panel">
        <EmptyState icon={Eye} title="Select a workout" />
      </section>
    );
  }

  return (
    <section className="panel detail-panel">
      <div className="detail-header">
        <h2>{workout.name}</h2>
        <span className="detail-date">{formatDate(workout.date)}</span>
        <strong>{Math.round(getWorkoutVolume(workout)).toLocaleString()} lb</strong>
      </div>

      {workout.notes && <p className="detail-notes">{workout.notes}</p>}

      <div className="exercise-detail-list">
        {workout.exercises.map((exercise) => (
          <div className="exercise-detail" key={exercise.id}>
            <h3>{exercise.name}</h3>
            <div className="set-table compact">
              <div className="set-row set-header">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight</span>
              </div>
              {exercise.sets.map((set) => (
                <div className="set-row" key={set.id}>
                  <span>{set.set_number}</span>
                  <span>{set.reps}</span>
                  <span>{set.weight} lb</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function createBlankTemplateSet(setNumber = 1) {
  return {
    set_number: setNumber,
    reps: "",
    weight: "",
  };
}

function createBlankTemplateExercise() {
  return {
    name: "",
    sets: [createBlankTemplateSet()],
  };
}

function normalizeTemplateForForm(template) {
  return template.exercises.length > 0
    ? template.exercises.map((exercise) => ({
        name: exercise.name,
        sets:
          exercise.sets.length > 0
            ? exercise.sets.map((set, index) => ({
                set_number: index + 1,
                reps: String(set.reps),
                weight: String(set.weight),
              }))
            : [createBlankTemplateSet()],
      }))
    : [createBlankTemplateExercise()];
}

function getTemplateExerciseSummary(template) {
  if (template.exercises.length === 0) {
    return "No exercises";
  }

  return template.exercises
    .map((exercise) => `${exercise.name} (${exercise.sets.length} sets)`)
    .join(", ");
}

function createBlankSessionSet(setNumber = 1) {
  return {
    ...createBlankTemplateSet(setNumber),
    completed: false,
  };
}

function createBlankSessionExercise() {
  return {
    name: "",
    sets: [createBlankSessionSet()],
  };
}

function buildSessionFromTemplate(template) {
  return {
    templateId: template.id,
    templateName: template.name,
    workoutName: template.name,
    exercises: normalizeTemplateForForm(template).map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set, index) => ({
        set_number: index + 1,
        reps: set.reps,
        weight: set.weight,
        completed: false,
      })),
    })),
  };
}

function buildTemplatePayloadFromSession(session) {
  return {
    name: session.templateName,
    exercises: session.exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets.map((set, index) => ({
          set_number: index + 1,
          reps: Number(set.reps),
          weight: Number(set.weight),
        })),
      }))
      .filter((exercise) => exercise.name),
  };
}

function buildWorkoutPayloadFromSession(session) {
  return {
    name: session.workoutName.trim() || session.templateName,
    notes: `Started from template: ${session.templateName}`,
    exercises: session.exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets
          .filter((set) => set.completed)
          .map((set, index) => ({
            set_number: index + 1,
            reps: Number(set.reps),
            weight: Number(set.weight),
          })),
      }))
      .filter((exercise) => exercise.name && exercise.sets.length > 0),
  };
}

function TemplateWorkoutModal({
  error,
  isFinishing,
  onClose,
  onFinish,
  session,
}) {
  const [workoutName, setWorkoutName] = useState(session?.workoutName || "");
  const [sessionExercises, setSessionExercises] = useState(
    session?.exercises || [],
  );

  useEffect(() => {
    if (session) {
      setWorkoutName(session.workoutName);
      setSessionExercises(session.exercises);
    }
  }, [session]);

  if (!session) {
    return null;
  }

  const updateSessionExercise = (exerciseIndex, patch) => {
    setSessionExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise,
      ),
    );
  };

  const updateSessionSet = (exerciseIndex, setIndex, patch) => {
    setSessionExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, innerIndex) =>
            innerIndex === setIndex ? { ...set, ...patch } : set,
          ),
        };
      }),
    );
  };

  const addSessionSet = (exerciseIndex) => {
    setSessionExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: [...exercise.sets, createBlankSessionSet(exercise.sets.length + 1)],
            }
          : exercise,
      ),
    );
  };

  const removeSessionSet = (exerciseIndex, setIndex) => {
    setSessionExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex || exercise.sets.length === 1) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets
            .filter((_, innerIndex) => innerIndex !== setIndex)
            .map((set, innerIndex) => ({
              ...set,
              set_number: innerIndex + 1,
            })),
        };
      }),
    );
  };

  const addSessionExercise = () => {
    setSessionExercises((current) => [...current, createBlankSessionExercise()]);
  };

  const removeSessionExercise = (exerciseIndex) => {
    setSessionExercises((current) =>
      current.length === 1
        ? current
        : current.filter((_, index) => index !== exerciseIndex),
    );
  };

  const markAllSets = (completed) => {
    setSessionExercises((current) =>
      current.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, completed })),
      })),
    );
  };

  const completeCount = sessionExercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  const totalSets = sessionExercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const areAllSetsComplete = totalSets > 0 && completeCount === totalSets;

  const finishWorkout = (event) => {
    event.preventDefault();
    onFinish({
      ...session,
      workoutName,
      exercises: sessionExercises,
    });
  };

  return (
    <div className="coach-modal-backdrop" role="presentation">
      <section
        aria-label="Template workout"
        aria-modal="true"
        className="coach-modal template-session-modal"
        role="dialog"
      >
        <div className="coach-modal-header">
          <div>
            <h2>
              <Dumbbell size={18} />
              Start Workout
            </h2>
            <span>{session.templateName}</span>
          </div>
          <button className="icon-button" onClick={onClose} title="Close" type="button">
            <X size={18} />
          </button>
        </div>

        <form className="template-session-form" onSubmit={finishWorkout}>
          <div className="template-session-top">
            <label>
              Workout name
              <input
                onChange={(event) => setWorkoutName(event.target.value)}
                required
                type="text"
                value={workoutName}
              />
            </label>
            <div className="session-progress">
              <strong>
                {completeCount}/{totalSets}
              </strong>
              <span>sets complete</span>
            </div>
          </div>

          <div className="template-session-body">
            {sessionExercises.map((exercise, exerciseIndex) => (
              <section className="template-exercise-card" key={exerciseIndex}>
                <div className="builder-heading">
                  <label>
                    Exercise
                    <input
                      onChange={(event) =>
                        updateSessionExercise(exerciseIndex, {
                          name: event.target.value,
                        })
                      }
                      required
                      type="text"
                      value={exercise.name}
                    />
                  </label>
                  <button
                    className="icon-button danger"
                    disabled={sessionExercises.length === 1}
                    onClick={() => removeSessionExercise(exerciseIndex)}
                    title="Remove exercise"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="template-session-set-list">
                  <div className="template-session-set-row template-set-header">
                    <span>Done</span>
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span />
                  </div>
                  {exercise.sets.map((set, setIndex) => (
                    <div className="template-session-set-row" key={setIndex}>
                      <label className="session-check">
                        <input
                          checked={set.completed}
                          onChange={(event) =>
                            updateSessionSet(exerciseIndex, setIndex, {
                              completed: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        <span>Done</span>
                      </label>
                      <strong>{setIndex + 1}</strong>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateSessionSet(exerciseIndex, setIndex, {
                            reps: event.target.value,
                          })
                        }
                        required
                        type="number"
                        value={set.reps}
                      />
                      <input
                        min="0"
                        onChange={(event) =>
                          updateSessionSet(exerciseIndex, setIndex, {
                            weight: event.target.value,
                          })
                        }
                        required
                        step="0.1"
                        type="number"
                        value={set.weight}
                      />
                      <button
                        className="icon-button danger"
                        disabled={exercise.sets.length === 1}
                        onClick={() => removeSessionSet(exerciseIndex, setIndex)}
                        title="Remove set"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="secondary-button"
                  onClick={() => addSessionSet(exerciseIndex)}
                  type="button"
                >
                  <Plus size={17} />
                  Add set
                </button>
              </section>
            ))}
          </div>

          <Notice type="error">{error}</Notice>

          <div className="builder-actions">
            <button
              className="secondary-button"
              onClick={() => markAllSets(!areAllSetsComplete)}
              type="button"
            >
              {areAllSetsComplete ? "Uncheck all" : "Check all"}
            </button>
            <button
              className="secondary-button"
              onClick={addSessionExercise}
              type="button"
            >
              <Plus size={17} />
              Add exercise
            </button>
            <button className="primary-button" disabled={isFinishing} type="submit">
              {isFinishing ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Finish workout
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TemplatesPage({ token }) {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([createBlankTemplateExercise()]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sessionError, setSessionError] = useState("");

  const loadTemplates = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/templates/", { token });
      setTemplates(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [token]);

  const resetForm = () => {
    setName("");
    setExercises([createBlankTemplateExercise()]);
    setEditingTemplateId(null);
  };

  const updateExercise = (exerciseIndex, patch) => {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise,
      ),
    );
  };

  const updateTemplateSet = (exerciseIndex, setIndex, patch) => {
    setExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, innerIndex) =>
            innerIndex === setIndex ? { ...set, ...patch } : set,
          ),
        };
      }),
    );
  };

  const addTemplateSet = (exerciseIndex) => {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: [...exercise.sets, createBlankTemplateSet(exercise.sets.length + 1)],
            }
          : exercise,
      ),
    );
  };

  const removeTemplateSet = (exerciseIndex, setIndex) => {
    setExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex || exercise.sets.length === 1) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets
            .filter((_, innerIndex) => innerIndex !== setIndex)
            .map((set, innerIndex) => ({
              ...set,
              set_number: innerIndex + 1,
            })),
        };
      }),
    );
  };

  const addExercise = () => {
    setExercises((current) => [...current, createBlankTemplateExercise()]);
  };

  const removeExercise = (exerciseIndex) => {
    setExercises((current) =>
      current.length === 1
        ? current
        : current.filter((_, index) => index !== exerciseIndex),
    );
  };

  const editTemplate = (template) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setExercises(normalizeTemplateForForm(template));
    setMessage("");
    setError("");
  };

  const startTemplateWorkout = (template) => {
    setActiveSession(buildSessionFromTemplate(template));
    setSessionError("");
    setMessage("");
    setError("");
  };

  const closeTemplateWorkout = () => {
    if (!isFinishingSession) {
      setActiveSession(null);
      setSessionError("");
    }
  };

  const finishTemplateWorkout = async (session) => {
    const workoutPayload = buildWorkoutPayloadFromSession(session);

    if (workoutPayload.exercises.length === 0) {
      setSessionError("Check at least one completed set before finishing.");
      return;
    }

    setIsFinishingSession(true);
    setSessionError("");

    try {
      const updatedTemplate = await apiRequest(`/templates/${session.templateId}`, {
        method: "PUT",
        token,
        body: buildTemplatePayloadFromSession(session),
      });
      await apiRequest("/workouts/", {
        method: "POST",
        token,
        body: workoutPayload,
      });
      setTemplates((current) =>
        current.map((template) =>
          template.id === updatedTemplate.id ? updatedTemplate : template,
        ),
      );
      if (editingTemplateId === updatedTemplate.id) {
        setName(updatedTemplate.name);
        setExercises(normalizeTemplateForForm(updatedTemplate));
      }
      setActiveSession(null);
      setSessionError("");
      setMessage("Workout logged and template updated.");
    } catch (apiError) {
      setSessionError(apiError.message);
    } finally {
      setIsFinishingSession(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    const payload = {
      name: name.trim(),
      exercises: exercises
        .map((exercise) => ({
          name: exercise.name.trim(),
          sets: exercise.sets.map((set, index) => ({
            set_number: index + 1,
            reps: Number(set.reps),
            weight: Number(set.weight),
          })),
        }))
        .filter((exercise) => exercise.name),
    };

    try {
      await apiRequest(
        editingTemplateId ? `/templates/${editingTemplateId}` : "/templates/",
        {
          method: editingTemplateId ? "PUT" : "POST",
          token,
          body: payload,
        },
      );
      resetForm();
      setMessage(editingTemplateId ? "Template updated." : "Template saved.");
      await loadTemplates();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    setError("");

    try {
      await apiRequest(`/templates/${templateId}`, {
        method: "DELETE",
        token,
      });
      if (editingTemplateId === templateId) {
        resetForm();
      }
      await loadTemplates();
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Planning" title="Templates" />
      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <h2>{editingTemplateId ? "Edit template" : "New template"}</h2>
            {editingTemplateId && (
              <button className="text-button" onClick={resetForm} type="button">
                Cancel
              </button>
            )}
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Name
              <input
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </label>

            <div className="template-exercise-list">
              {exercises.map((exercise, exerciseIndex) => (
                <section className="template-exercise-card" key={exerciseIndex}>
                  <div className="builder-heading">
                    <label>
                      Exercise
                      <input
                        onChange={(event) =>
                          updateExercise(exerciseIndex, { name: event.target.value })
                        }
                        placeholder="Exercise name"
                        required
                        type="text"
                        value={exercise.name}
                      />
                    </label>
                    <button
                      className="icon-button danger"
                      disabled={exercises.length === 1}
                      onClick={() => removeExercise(exerciseIndex)}
                      title="Remove exercise"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="template-set-list">
                    <div className="template-set-row template-set-header">
                      <span>Set</span>
                      <span>Reps</span>
                      <span>Weight</span>
                      <span />
                    </div>
                    {exercise.sets.map((set, setIndex) => (
                      <div className="template-set-row" key={setIndex}>
                        <strong>{setIndex + 1}</strong>
                        <input
                          min="1"
                          onChange={(event) =>
                            updateTemplateSet(exerciseIndex, setIndex, {
                              reps: event.target.value,
                            })
                          }
                          required
                          type="number"
                          value={set.reps}
                        />
                        <input
                          min="0"
                          onChange={(event) =>
                            updateTemplateSet(exerciseIndex, setIndex, {
                              weight: event.target.value,
                            })
                          }
                          required
                          step="0.1"
                          type="number"
                          value={set.weight}
                        />
                        <button
                          className="icon-button danger"
                          disabled={exercise.sets.length === 1}
                          onClick={() => removeTemplateSet(exerciseIndex, setIndex)}
                          title="Remove set"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => addTemplateSet(exerciseIndex)}
                    type="button"
                  >
                    <Plus size={17} />
                    Add set
                  </button>
                </section>
              ))}
            </div>

            <div className="builder-actions">
              <button
                className="secondary-button"
                onClick={addExercise}
                type="button"
              >
                <Plus size={17} />
                Add exercise
              </button>
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                {editingTemplateId ? "Update" : "Save"}
              </button>
            </div>
          </form>
          <Notice type="success">{message}</Notice>
          <Notice type="error">{error}</Notice>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Saved templates</h2>
          </div>
          {isLoading ? (
            <FullScreenLoader />
          ) : templates.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No templates saved" />
          ) : (
            <div className="compact-list">
              {templates.map((template) => (
                <div
                  className={
                    editingTemplateId === template.id
                      ? "list-row selected"
                      : "list-row static"
                  }
                  key={template.id}
                >
                  <div>
                    <div className="template-title-row">
                      <strong>{template.name}</strong>
                      <button
                        className="text-button"
                        onClick={() => editTemplate(template)}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                    <span>{getTemplateExerciseSummary(template)}</span>
                  </div>
                  <div className="template-row-actions">
                    <button
                      className="text-button"
                      onClick={() => startTemplateWorkout(template)}
                      type="button"
                    >
                      Start Workout
                    </button>
                    <button
                      className="icon-button danger"
                      onClick={() => deleteTemplate(template.id)}
                      title="Delete template"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <TemplateWorkoutModal
        error={sessionError}
        isFinishing={isFinishingSession}
        onClose={closeTemplateWorkout}
        onFinish={finishTemplateWorkout}
        session={activeSession}
      />
    </>
  );
}

function BodyweightPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(readBodyProfile);
  const [profileForm, setProfileForm] = useState(readBodyProfile);
  const [isProfileOpen, setIsProfileOpen] = useState(
    () => !hasBodyProfile(readBodyProfile()),
  );
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadLogs = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/bodyweight/", { token });
      setLogs(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [token]);

  const updateProfileForm = (patch) => {
    setProfileForm((current) => ({ ...current, ...patch }));
  };

  const submitProfile = (event) => {
    event.preventDefault();

    const nextProfile = {
      age: profileForm.age.trim(),
      height: profileForm.height.trim(),
      gender: profileForm.gender,
    };

    localStorage.setItem(BODY_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setProfileForm(nextProfile);
    setIsProfileOpen(false);
  };

  const collapseProfile = () => {
    if (hasBodyProfile(profile)) {
      setIsProfileOpen(false);
    }
  };

  const handleProfileHeadingKeyDown = (event) => {
    if (!hasBodyProfile(profile)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsProfileOpen(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/bodyweight/", {
        method: "POST",
        token,
        body: {
          weight: Number(weight),
          date: date ? new Date(`${date}T12:00:00`).toISOString() : null,
        },
      });
      setWeight("");
      setDate("");
      setMessage("Bodyweight saved.");
      await loadLogs();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteLog = async (logId) => {
    setError("");

    try {
      await apiRequest(`/bodyweight/${logId}`, {
        method: "DELETE",
        token,
      });
      await loadLogs();
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Metrics" title="Bodyweight" />

      {isProfileOpen ? (
        <section className="panel profile-panel">
          <div
            className={`panel-heading profile-heading ${
              hasBodyProfile(profile) ? "is-clickable" : ""
            }`}
            onClick={collapseProfile}
            onKeyDown={handleProfileHeadingKeyDown}
            role={hasBodyProfile(profile) ? "button" : undefined}
            tabIndex={hasBodyProfile(profile) ? 0 : undefined}
          >
            <h2>Body profile</h2>
          </div>
          <form className="form-stack" onSubmit={submitProfile}>
            <div className="form-grid three">
              <label>
                Age
                <input
                  max="120"
                  min="1"
                  onChange={(event) => updateProfileForm({ age: event.target.value })}
                  required
                  step="1"
                  type="number"
                  value={profileForm.age}
                />
              </label>
              <label>
                Height
                <input
                  maxLength={20}
                  onChange={(event) => updateProfileForm({ height: event.target.value })}
                  placeholder={`5'10"`}
                  required
                  type="text"
                  value={profileForm.height}
                />
              </label>
              <label>
                Gender
                <select
                  onChange={(event) => updateProfileForm({ gender: event.target.value })}
                  required
                  value={profileForm.gender}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
            </div>
            <button className="primary-button" type="submit">
              <Save size={18} />
              Save profile
            </button>
          </form>
        </section>
      ) : (
        <button
          className="profile-collapsed"
          onClick={() => setIsProfileOpen(true)}
          type="button"
        >
          <strong>Body profile</strong>
          <span>{formatBodyProfile(profile)}</span>
        </button>
      )}

      <div className="two-column wide-left bodyweight-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>Chart</h2>
          </div>
          {isLoading ? <FullScreenLoader /> : <BodyweightChart logs={logs} />}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>New log</h2>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Weight
              <input
                min="1"
                onChange={(event) => setWeight(event.target.value)}
                required
                step="0.1"
                type="number"
                value={weight}
              />
            </label>
            <label>
              Date
              <input
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save
            </button>
          </form>
          <Notice type="success">{message}</Notice>
          <Notice type="error">{error}</Notice>
        </section>
      </div>

      <section className="panel bodyweight-logs-panel">
        <div className="panel-heading">
          <h2>Logs</h2>
        </div>
        {logs.length === 0 ? (
          <EmptyState icon={Scale} title="No bodyweight logs" />
        ) : (
          <div className="compact-list">
            {[...logs].reverse().map((log) => (
              <div className="list-row static" key={log.id}>
                <div>
                  <strong>{log.weight} lb</strong>
                  <span>{formatDate(log.date)}</span>
                </div>
                <button
                  className="icon-button danger"
                  onClick={() => deleteLog(log.id)}
                  title="Delete log"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function BodyweightChart({ logs, compact = false }) {
  const points = useMemo(() => {
    if (logs.length === 0) {
      return [];
    }

    const width = 640;
    const height = 260;
    const padding = 34;
    const weights = logs.map((log) => log.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const spread = Math.max(maxWeight - minWeight, 1);
    const yMin = minWeight - spread * 0.12;
    const yMax = maxWeight + spread * 0.12;

    return logs.map((log, index) => {
      const x =
        logs.length === 1
          ? width / 2
          : padding + (index / (logs.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((log.weight - yMin) / (yMax - yMin)) * (height - padding * 2);

      return { x, y, log };
    });
  }, [compact, logs]);

  if (logs.length === 0) {
    return <EmptyState icon={LineChart} title="No chart data" />;
  }

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className={compact ? "chart compact-chart" : "chart"}>
      <svg aria-label="Bodyweight chart" role="img" viewBox="0 0 640 260">
        <path className="chart-grid" d="M 34 42 H 606 M 34 130 H 606 M 34 218 H 606" />
        {points.length > 1 && <path className="chart-line" d={path} />}
        {points.map((point) => (
          <g key={point.log.id}>
            <circle className="chart-point" cx={point.x} cy={point.y} r="5" />
          </g>
        ))}
      </svg>
      <div className="chart-meta">
        <span>{formatDate(logs[0].date)}</span>
        <strong>{logs[logs.length - 1].weight} lb</strong>
        <span>{formatDate(logs[logs.length - 1].date)}</span>
      </div>
    </div>
  );
}

function MacroPieChart({ totals }) {
  const macros = [
    {
      name: "Protein",
      grams: totals.protein,
      calories: totals.protein * 4,
      color: "#b9f4c9",
    },
    {
      name: "Carbs",
      grams: totals.carbs,
      calories: totals.carbs * 4,
      color: "#9fd8ff",
    },
    {
      name: "Fat",
      grams: totals.fat,
      calories: totals.fat * 9,
      color: "#ffb8b8",
    },
  ];
  const macroCalories = macros.reduce((total, macro) => total + macro.calories, 0);

  if (macroCalories <= 0) {
    return (
      <div className="nutrition-pie-empty">
        <Utensils size={20} />
        <span>No macro totals yet</span>
      </div>
    );
  }

  let currentPercent = 0;
  const gradient = macros
    .map((macro) => {
      const start = currentPercent;
      currentPercent += (macro.calories / macroCalories) * 100;
      return `${macro.color} ${start}% ${currentPercent}%`;
    })
    .join(", ");

  return (
    <div className="nutrition-pie-wrap">
      <div
        aria-label="Macro calorie split"
        className="nutrition-pie"
        role="img"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div>
          <strong>{Math.round(macroCalories)}</strong>
          <span>macro cal</span>
        </div>
      </div>
      <div className="nutrition-legend">
        {macros.map((macro) => {
          const percent = Math.round((macro.calories / macroCalories) * 100);

          return (
            <div className="nutrition-legend-row" key={macro.name}>
              <span style={{ background: macro.color }} />
              <strong>{macro.name}</strong>
              <em>{percent}%</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NutritionGoalProgress({ goals, totals }) {
  if (!goals) {
    return null;
  }

  const rows = [
    {
      label: "Calories",
      current: totals.calories,
      target: goals.calories,
      unit: "",
    },
    {
      label: "Protein",
      current: totals.protein,
      target: goals.protein,
      unit: "g",
    },
    {
      label: "Carbs",
      current: totals.carbs,
      target: goals.carbs,
      unit: "g",
    },
    {
      label: "Fat",
      current: totals.fat,
      target: goals.fat,
      unit: "g",
    },
  ];

  return (
    <div className="nutrition-goal-progress">
      {rows.map((row) => {
        const percent =
          row.target > 0 ? Math.min((row.current / row.target) * 100, 100) : 0;
        const remaining = row.target - row.current;
        const progressText =
          remaining >= 0
            ? `${formatNutritionNumber(remaining, row.unit)} left`
            : `${formatNutritionNumber(Math.abs(remaining), row.unit)} over`;

        return (
          <div className="nutrition-progress-row" key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{progressText}</span>
            </div>
            <div className="nutrition-progress-track">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NutritionPage({ openCoach, token }) {
  const [entries, setEntries] = useState([]);
  const [goals, setGoals] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate());
  const [form, setForm] = useState({
    item_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [goalForm, setGoalForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [areGoalsOpen, setAreGoalsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadEntries = async () => {
    setIsLoading(true);
    setError("");

    try {
      const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
      const data = await apiRequest(`/nutrition/${query}`, { token });
      setEntries(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoals = async () => {
    setError("");

    try {
      const data = await apiRequest("/nutrition/goals", { token });
      setGoals(data);

      if (data) {
        setGoalForm({
          calories: String(data.calories),
          protein: String(data.protein),
          carbs: String(data.carbs),
          fat: String(data.fat),
        });
        setAreGoalsOpen(false);
      }
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [selectedDate, token]);

  useEffect(() => {
    loadGoals();
  }, [token]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (total, entry) => ({
          calories: total.calories + entry.calories,
          protein: total.protein + entry.protein,
          carbs: total.carbs + entry.carbs,
          fat: total.fat + entry.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [entries],
  );

  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateGoalForm = (patch) => {
    setGoalForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/nutrition/", {
        method: "POST",
        token,
        body: {
          item_name: form.item_name.trim(),
          calories: Number(form.calories),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fat: Number(form.fat),
          date: selectedDate ? new Date(`${selectedDate}T12:00:00`).toISOString() : null,
        },
      });

      setForm({
        item_name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
      setMessage("Nutrition entry saved.");
      await loadEntries();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (entryId) => {
    setError("");
    setMessage("");

    try {
      await apiRequest(`/nutrition/${entryId}`, {
        method: "DELETE",
        token,
      });
      await loadEntries();
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  const submitGoals = async (event) => {
    event.preventDefault();
    setIsSavingGoals(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/nutrition/goals", {
        method: "PUT",
        token,
        body: {
          calories: Number(goalForm.calories),
          protein: Number(goalForm.protein),
          carbs: Number(goalForm.carbs),
          fat: Number(goalForm.fat),
        },
      });
      setGoals(data);
      setGoalForm({
        calories: String(data.calories),
        protein: String(data.protein),
        carbs: String(data.carbs),
        fat: String(data.fat),
      });
      setAreGoalsOpen(false);
      setMessage("Nutrition goals saved.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSavingGoals(false);
    }
  };

  const collapseGoals = () => {
    if (goals) {
      setAreGoalsOpen(false);
    }
  };

  const handleGoalsHeadingKeyDown = (event) => {
    if (!goals) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setAreGoalsOpen(false);
    }
  };

  const askCoachForTargets = async () => {
    const profile = readBodyProfile();
    let currentBodyweight = "";

    try {
      const bodyweightLogs = await apiRequest("/bodyweight/", { token });
      const latestLog = bodyweightLogs[bodyweightLogs.length - 1];
      currentBodyweight = latestLog?.weight || "";
    } catch {
      currentBodyweight = "";
    }

    setCoachDraft(buildDietTargetQuestion(profile, currentBodyweight));
    openCoach();
  };

  return (
    <>
      <PageHeader eyebrow="Fuel" title="Nutrition" />

      {areGoalsOpen ? (
        <section className="panel nutrition-goals-panel">
          <div
            className={`panel-heading nutrition-goals-heading ${
              goals ? "is-clickable" : ""
            }`}
            onClick={collapseGoals}
            onKeyDown={handleGoalsHeadingKeyDown}
            role={goals ? "button" : undefined}
            tabIndex={goals ? 0 : undefined}
          >
            <h2>Daily goals</h2>
          </div>
          <form className="form-stack" onSubmit={submitGoals}>
            <div className="form-grid two">
              <label>
                Calorie goal
                <input
                  min="0"
                  onChange={(event) => updateGoalForm({ calories: event.target.value })}
                  required
                  step="1"
                  type="number"
                  value={goalForm.calories}
                />
              </label>
              <label>
                Protein goal
                <input
                  min="0"
                  onChange={(event) => updateGoalForm({ protein: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={goalForm.protein}
                />
              </label>
              <label>
                Carb goal
                <input
                  min="0"
                  onChange={(event) => updateGoalForm({ carbs: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={goalForm.carbs}
                />
              </label>
              <label>
                Fat goal
                <input
                  min="0"
                  onChange={(event) => updateGoalForm({ fat: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={goalForm.fat}
                />
              </label>
            </div>
            <div className="nutrition-goals-actions">
              <p>
                Ask Coach about your diet goals for optimal targets based on your height,
                age, gender, bodyweight, and activity level.
              </p>
              <button className="text-button" onClick={askCoachForTargets} type="button">
                Ask Coach
              </button>
            </div>
            <button className="primary-button" disabled={isSavingGoals} type="submit">
              {isSavingGoals ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save goals
            </button>
          </form>
        </section>
      ) : (
        <button
          className="nutrition-goals-collapsed"
          onClick={() => setAreGoalsOpen(true)}
          type="button"
        >
          <strong>Daily goals</strong>
          {goals ? (
            <span>
              {formatNutritionNumber(goals.calories)} cal | Protein{" "}
              {formatNutritionNumber(goals.protein, "g")} | Carbs{" "}
              {formatNutritionNumber(goals.carbs, "g")} | Fat{" "}
              {formatNutritionNumber(goals.fat, "g")}
            </span>
          ) : (
            <span>Set calorie and macro targets</span>
          )}
        </button>
      )}

      <div className="two-column wide-left nutrition-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <Utensils size={18} />
              Daily totals
            </h2>
          </div>

          <label>
            Day
            <input
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </label>

          <div className="summary-grid nutrition-total-grid">
            <div className="summary-card">
              <span>Calories</span>
              <strong>{formatNutritionNumber(totals.calories)}</strong>
            </div>
            <div className="summary-card">
              <span>Protein</span>
              <strong>{formatNutritionNumber(totals.protein, "g")}</strong>
            </div>
            <div className="summary-card">
              <span>Carbs</span>
              <strong>{formatNutritionNumber(totals.carbs, "g")}</strong>
            </div>
            <div className="summary-card">
              <span>Fat</span>
              <strong>{formatNutritionNumber(totals.fat, "g")}</strong>
            </div>
          </div>

          <MacroPieChart totals={totals} />
          <NutritionGoalProgress goals={goals} totals={totals} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>New entry</h2>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Item name
              <input
                onChange={(event) => updateForm({ item_name: event.target.value })}
                placeholder="Chicken rice bowl"
                required
                type="text"
                value={form.item_name}
              />
            </label>
            <div className="form-grid two">
              <label>
                Calories
                <input
                  min="0"
                  onChange={(event) => updateForm({ calories: event.target.value })}
                  required
                  step="1"
                  type="number"
                  value={form.calories}
                />
              </label>
              <label>
                Protein
                <input
                  min="0"
                  onChange={(event) => updateForm({ protein: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={form.protein}
                />
              </label>
              <label>
                Carbs
                <input
                  min="0"
                  onChange={(event) => updateForm({ carbs: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={form.carbs}
                />
              </label>
              <label>
                Fat
                <input
                  min="0"
                  onChange={(event) => updateForm({ fat: event.target.value })}
                  required
                  step="0.1"
                  type="number"
                  value={form.fat}
                />
              </label>
            </div>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save entry
            </button>
          </form>
          <Notice type="success">{message}</Notice>
          <Notice type="error">{error}</Notice>
        </section>
      </div>

      <section className="panel nutrition-entries-panel">
        <div className="panel-heading">
          <h2>Entries</h2>
        </div>
        {isLoading ? (
          <FullScreenLoader />
        ) : entries.length === 0 ? (
          <EmptyState icon={Utensils} title="No nutrition entries" />
        ) : (
          <div className="compact-list">
            {entries.map((entry) => (
              <div className="list-row static" key={entry.id}>
                <div>
                  <strong>{entry.item_name}</strong>
                  <span>
                    {formatNutritionNumber(entry.calories)} cal | Protein{" "}
                    {formatNutritionNumber(entry.protein, "g")} | Carbs{" "}
                    {formatNutritionNumber(entry.carbs, "g")} | Fat{" "}
                    {formatNutritionNumber(entry.fat, "g")}
                  </span>
                </div>
                <button
                  className="icon-button danger"
                  onClick={() => deleteEntry(entry.id)}
                  title="Delete entry"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ProgressPhotosPage({ token }) {
  const [photos, setPhotos] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPhotos = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/progress-photos/", { token });
      setPhotos(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [token]);

  const uploadPhoto = async (event) => {
    event.preventDefault();
    setIsUploading(true);
    setError("");
    setMessage("");

    try {
      if (!file) {
        throw new Error("Choose an image file.");
      }

      const formData = new FormData();
      formData.append("file", file);
      if (uploadNotes.trim()) {
        formData.append("notes", uploadNotes.trim());
      }

      await apiRequest("/progress-photos/upload", {
        method: "POST",
        token,
        body: formData,
      });

      setFile(null);
      setUploadNotes("");
      setFileInputKey((current) => current + 1);
      setMessage("Photo uploaded.");
      await loadPhotos();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoId) => {
    setError("");

    try {
      await apiRequest(`/progress-photos/${photoId}`, {
        method: "DELETE",
        token,
      });
      await loadPhotos();
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Progress" title="Photo Timeline" />

      <section className="panel photos-upload-panel">
        <div className="panel-heading">
          <h2>Upload image</h2>
        </div>
        <form className="form-stack" onSubmit={uploadPhoto}>
          <label>
            Image
            <input
              accept="image/jpeg,image/png,image/webp"
              key={fileInputKey}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              type="file"
            />
          </label>
          <label>
            Notes
            <input
              onChange={(event) => setUploadNotes(event.target.value)}
              type="text"
              value={uploadNotes}
            />
          </label>
          <button className="primary-button" disabled={isUploading} type="submit">
            {isUploading ? <Loader2 className="spin" size={18} /> : <ImagePlus size={18} />}
            Upload
          </button>
        </form>
      </section>

      <Notice type="success">{message}</Notice>
      <Notice type="error">{error}</Notice>

      <section className="panel photos-timeline-panel">
        <div className="panel-heading">
          <h2>Timeline</h2>
        </div>

        {isLoading ? (
          <FullScreenLoader />
        ) : photos.length === 0 ? (
          <EmptyState icon={Camera} title="No progress photos" />
        ) : (
          <div className="photo-grid">
            {photos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <img alt={photo.notes || "Progress"} src={resolveMediaUrl(photo.photo_url)} />
                <div className="photo-card-footer">
                  <div>
                    <strong>{formatDate(photo.date)}</strong>
                    <span>{photo.notes || "No notes"}</span>
                  </div>
                  <button
                    className="icon-button danger"
                    onClick={() => deletePhoto(photo.id)}
                    title="Delete photo"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [route, navigate] = useHashRoute();

  const [currentPage, selectedId] = route.split("/");

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsCoachOpen(false);
    navigate("dashboard");
  };

  const openCoach = () => setIsCoachOpen(true);
  const closeCoach = () => setIsCoachOpen(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!token) {
        setIsAuthReady(true);
        return;
      }

      setIsAuthReady(false);

      try {
        const currentUser = await apiRequest("/me", { token });
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (currentPage === "coach") {
      setIsCoachOpen(true);
      navigate("dashboard");
    }
  }, [currentPage]);

  const handleAuth = (nextToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
  };

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (!isAuthReady) {
    return <FullScreenLoader />;
  }

  const pages = {
    dashboard: <Dashboard navigate={navigate} token={token} />,
    log: <WorkoutLogger token={token} />,
    workouts: (
      <WorkoutHistory navigate={navigate} selectedId={selectedId} token={token} />
    ),
    templates: <TemplatesPage token={token} />,
    bodyweight: <BodyweightPage token={token} />,
    nutrition: <NutritionPage openCoach={openCoach} token={token} />,
    photos: <ProgressPhotosPage token={token} />,
  };

  return (
    <CoachButtonContext.Provider value={openCoach}>
      <AppShell
        currentPage={currentPage}
        navigate={navigate}
        onLogout={logout}
        user={user}
      >
        {pages[currentPage] || pages.dashboard}
      </AppShell>
      <CoachChatModal isOpen={isCoachOpen} onClose={closeCoach} token={token} />
    </CoachButtonContext.Provider>
  );
}

export default App;
