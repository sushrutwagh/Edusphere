import React, { useEffect, useState } from "react";
import { Edit, Trash, XCircle } from "lucide-react";
export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  // Changed from string to object so we can display subject details in the confirmation
  const [subjectToDelete, setSubjectToDelete] = useState<any>(null);
  const [editSubject, setEditSubject] = useState<any>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState({
    subject_name: "",
    subject_code: "",
    description: "",
    max_no_of_hours: "",
    hours_conducted: "",
    start_date: "",
    end_date: "",
    semester: "",
    class_code: "",
    commencement_year: "",
    class: "",
    teacher: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    subject_name: "",
    subject_code: "",
    max_no_of_hours: "",
    hours_conducted: "",
    semester: "",
    reg_id: "", // Stored as a number in DB
    class_code: "", // Stored as a number in DB
    commencement_year: "", // Stored as a number in DB
    course: "",
    specialization: "",
    teacher: "",
  });
  const filteredSubjects = subjects.filter((subject) => {
    return (
      (!filters.subject_name ||
        subject.subject_name
          ?.toLowerCase()
          .includes(filters.subject_name.toLowerCase())) &&
      (!filters.subject_code ||
        subject.subject_code
          ?.toLowerCase()
          .includes(filters.subject_code.toLowerCase())) &&
      (!filters.max_no_of_hours ||
        subject.max_no_of_hours
          ?.toString()
          .includes(filters.max_no_of_hours)) &&
      (!filters.hours_conducted ||
        subject.hours_conducted
          ?.toString()
          .includes(filters.hours_conducted)) &&
      (!filters.semester ||
        subject.semester?.toString().includes(filters.semester)) &&
      // 🔹 Fix for Class Code & Commencement Year (Convert filter values to numbers before comparing)
      (!filters.class_code ||
        Number(subject.class_code) === Number(filters.class_code)) &&
      (!filters.commencement_year ||
        Number(subject.commencement_year) ===
        Number(filters.commencement_year)) &&
      (!filters.course ||
        subject.class?.course
          ?.toLowerCase()
          .includes(filters.course.toLowerCase())) &&
      (!filters.specialization ||
        subject.class?.specialization
          ?.toLowerCase()
          .includes(filters.specialization.toLowerCase())) &&
      (!filters.teacher ||
        subject.teacher?.name
          ?.toLowerCase()
          .includes(filters.teacher.toLowerCase()))
    );
  });

  const clearFilters = () => {
    setFilters({
      subject_name: "",
      subject_code: "",
      max_no_of_hours: "",
      hours_conducted: "",
      semester: "",
      reg_id: "",
      class_code: "",
      commencement_year: "",
      course: "",
      specialization: "",
      teacher: "",
    });
  };

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
    fetchClasses();
  }, []);
  useEffect(() => {
    if (editSubject?.class_code) {
      const filteredYears = classes
        .filter(
          (c) => c.class_code.toString() === editSubject.class_code.toString()
        )
        .map((c) => c.commencement_year.toString());
      setAvailableYears(filteredYears);
      // Auto-select commencement year only if it exists in filteredYears
      if (filteredYears.includes(editSubject.commencement_year)) {
        setEditSubject((prev: any) => ({
          ...prev,
          commencement_year: editSubject.commencement_year,
        }));
      }
    }
  }, [editSubject?.class_code, classes]);
  useEffect(() => {
    if (editSubject?.commencement_year) {
      console.log(
        "🔥 Forced React Render - Updated commencement_year:",
        editSubject.commencement_year
      );
    }
  }, [editSubject?.commencement_year]);
  const fetchTeachers = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/teachers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch teachers");
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };
  const fetchClasses = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/classes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch classes");
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };
  const fetchSubjects = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/subjects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };
  const handleCreateSubject = async () => {
    // Check: hours conducted must not exceed max hours
    if (
      Number(newSubject.hours_conducted) > Number(newSubject.max_no_of_hours)
    ) {
      alert("Hours conducted cannot be greater than max hours.");
      return;
    }
    // Check: ensure uniqueness using local subjects list
    if (
      subjects.some(
        (subj) =>
          subj.subject_code === newSubject.subject_code &&
          subj.class_code.toString() === newSubject.class_code.toString() &&
          subj.commencement_year.toString() ===
          newSubject.commencement_year.toString()
      )
    ) {
      alert("This subject already exists for the given class and year.");
      return;
    }
    try {
      const response = await fetch(
        "http://localhost:5001/api/subjects/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            ...newSubject,
            // Explicitly sending the current values for class_code & commencement_year
            class_code: newSubject.class_code,
            commencement_year: newSubject.commencement_year,
          }),
        }
      );
      const result = await response.json();
      if (response.ok) {
        alert("Subject created successfully");
        fetchSubjects();
        // Reset newSubject state so that the modal starts fresh next time:
        setNewSubject({
          subject_name: "",
          subject_code: "",
          description: "",
          max_no_of_hours: "",
          hours_conducted: "",
          start_date: "",
          end_date: "",
          semester: "",
          class_code: "",
          commencement_year: "",
          class: "",
          teacher: "",
        });
        setShowModal(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error creating subject:", error);
    }
  };
  const handleEditSubject = (subject: any) => {
    console.log("📌 Editing Subject:", subject); // Debug
    setEditSubject({
      ...subject,
      start_date: subject.start_date?.split("T")[0] || "",
      end_date: subject.end_date?.split("T")[0] || "",
    });
    // Pre-filter available commencement years
    const filteredYears = classes
      .filter((c) => c.class_code.toString() === subject.class_code.toString())
      .map((c) => c.commencement_year.toString());
    setAvailableYears(filteredYears);
    setEditModal(true);
  };
  const handleClassSelection = (classCode: string) => {
    setEditSubject((prev: any) => ({
      ...prev,
      class_code: classCode,
      commencement_year: "", // Reset commencement_year
      class: "", // Reset class ID
    }));
  };
  const handleYearSelection = (year: string) => {
    console.log(
      "📌 Selected Year BEFORE Update:",
      editSubject.commencement_year
    );
    console.log("📌 Trying to Update Commencement Year to:", year);
    const selectedClass = classes.find(
      (c) =>
        c.class_code.toString() === editSubject.class_code.toString() &&
        c.commencement_year.toString() === year
    );
    if (selectedClass) {
      // Force React to recognize the change by clearing the state first
      setEditSubject((prev: any) => ({
        ...prev,
        commencement_year: "", // Clear first
      }));
      setTimeout(() => {
        setEditSubject((prev: any) => ({
          ...prev,
          commencement_year: year, // Update
          class: selectedClass._id, // Update class ID
        }));
        console.log("✅ Updated editSubject State:", {
          ...editSubject,
          commencement_year: year,
          class: selectedClass._id,
        });
      }, 1);
    }
  };
  const handleUpdateSubject = async () => {
    // Check: hours conducted must not exceed max hours
    if (
      Number(editSubject.hours_conducted) > Number(editSubject.max_no_of_hours)
    ) {
      alert("Hours conducted cannot be greater than max hours.");
      return;
    }
    // Check: ensure uniqueness (exclude current subject)
    if (
      subjects.some(
        (subj) =>
          subj._id !== editSubject._id &&
          subj.subject_code === editSubject.subject_code &&
          subj.class_code.toString() === editSubject.class_code.toString() &&
          subj.commencement_year.toString() ===
          editSubject.commencement_year.toString()
      )
    ) {
      alert("This subject already exists for the given class and year.");
      return;
    }
    console.log("📌 Final Subject Data Before Update:", editSubject);
    if (
      !editSubject.class_code ||
      !editSubject.commencement_year ||
      !editSubject.class
    ) {
      alert("Please select a valid class and commencement year.");
      return;
    }
    try {
      console.log("📌 Final Subject Data Before Update:", editSubject);
      const response = await fetch(
        `http://localhost:5001/api/subjects/update/${editSubject._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            ...editSubject,
            class_code: Number(editSubject.class_code),
            commencement_year: Number(editSubject.commencement_year), // Convert to number
            class: editSubject.class,
          }),
        }
      );
      const result = await response.json();
      console.log("📌 Server Response:", result);
      if (response.ok) {
        alert("Subject updated successfully");
        fetchSubjects();
        setEditModal(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("❌ Error updating subject:", error);
    }
  };
  // Updated: Store the entire subject object for deletion confirmation
  const confirmDeleteSubject = (subject: any) => {
    setSubjectToDelete(subject);
    setDeleteModal(true);
  };
  const handleDeleteSubject = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/subjects/delete/${subjectToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.ok) {
        alert("Subject deleted successfully");
        fetchSubjects();
        setDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  };
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Manage Subjects</h2>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 btn-secondary text-black border rounded-lg hover:bg-gray-100 transition-colors"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto px-4 py-2 btn-primary text-white rounded-lg hover:bg-indigo-800 transition-colors"
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Filters UI */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-md mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            placeholder="Filter by Subject Name"
            value={filters.subject_name}
            onChange={(e) =>
              setFilters({ ...filters, subject_name: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Subject Code"
            value={filters.subject_code}
            onChange={(e) =>
              setFilters({ ...filters, subject_code: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="number"
            placeholder="Filter by Max Hours"
            value={filters.max_no_of_hours}
            onChange={(e) =>
              setFilters({ ...filters, max_no_of_hours: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="number"
            placeholder="Filter by Hours Conducted"
            value={filters.hours_conducted}
            onChange={(e) =>
              setFilters({ ...filters, hours_conducted: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Semester"
            value={filters.semester}
            onChange={(e) =>
              setFilters({ ...filters, semester: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="number"
            placeholder="Filter by Class Code"
            value={filters.class_code}
            onChange={(e) =>
              setFilters({
                ...filters,
                class_code: e.target.value ? Number(e.target.value) : "",
              })
            }
            className="input-primary"
          />

          <input
            type="number"
            placeholder="Filter by Commencement Year"
            value={filters.commencement_year}
            onChange={(e) =>
              setFilters({ ...filters, commencement_year: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Teacher"
            value={filters.teacher}
            onChange={(e) =>
              setFilters({ ...filters, teacher: e.target.value })
            }
            className="input-primary"
          />
          <button
            onClick={clearFilters}
            className="btn-secondary flex items-center"
          >
            <XCircle className="h-5 w-5 mr-2" /> Clear Filters
          </button>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Create New Subject</h3>
            <input
              type="text"
              placeholder="Subject Name"
              className="input-primary w-full mb-2"
              value={newSubject.subject_name}
              onChange={(e) =>
                setNewSubject({ ...newSubject, subject_name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Subject Code"
              className="input-primary w-full mb-2"
              value={newSubject.subject_code}
              onChange={(e) =>
                setNewSubject({ ...newSubject, subject_code: e.target.value })
              }
            />
            <textarea
              placeholder="Description"
              className="input-primary w-full h-24 mb-2"
              value={newSubject.description}
              onChange={(e) =>
                setNewSubject({ ...newSubject, description: e.target.value })
              }
            />
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Max Hours"
                className="input-primary w-full mb-2"
                value={newSubject.max_no_of_hours}
                onChange={(e) =>
                  setNewSubject({
                    ...newSubject,
                    max_no_of_hours: e.target.value,
                  })
                }
              />
              <input
                type="number"
                placeholder="Hours Conducted"
                className="input-primary w-full mb-2"
                value={newSubject.hours_conducted}
                onChange={(e) =>
                  setNewSubject({
                    ...newSubject,
                    hours_conducted: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                className="input-primary w-full mb-2"
                value={newSubject.start_date}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, start_date: e.target.value })
                }
              />
              <input
                type="date"
                className="input-primary w-full mb-2"
                value={newSubject.end_date}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, end_date: e.target.value })
                }
              />
            </div>
            <input
              type="number"
              placeholder="Semester"
              className="input-primary w-full mb-2"
              value={newSubject.semester}
              onChange={(e) =>
                setNewSubject({ ...newSubject, semester: e.target.value })
              }
            />
            {/* Select Unique Class Codes */}
            <select
              className="input-primary w-full mb-2"
              value={newSubject.class_code}
              onChange={(e) => {
                const selectedClassCode = e.target.value;
                setNewSubject({
                  ...newSubject,
                  class_code: selectedClassCode,
                  commencement_year: "", // Reset commencement year when class changes
                  class: "", // Reset class ID
                });
              }}
            >
              <option value="">Select Class Code</option>
              {Array.from(new Set(classes.map((c) => c.class_code))).map(
                (classCode) => (
                  <option key={classCode} value={classCode}>
                    {classCode}
                  </option>
                )
              )}
            </select>
            {/* Select Unique Commencement Years (Filtered by Selected Class Code) */}
            <select
              className="input-primary w-full mb-2"
              value={newSubject.commencement_year}
              onChange={(e) => {
                const selectedYear = e.target.value;
                setNewSubject((prev) => ({
                  ...prev,
                  commencement_year: selectedYear,
                }));
                // Automatically find Class ID when both are selected
                const selectedClass = classes.find(
                  (c) =>
                    c.class_code.toString() === newSubject.class_code &&
                    c.commencement_year.toString() === selectedYear
                );
                if (selectedClass) {
                  setNewSubject((prev) => ({
                    ...prev,
                    class: selectedClass._id,
                  }));
                }
              }}
              disabled={!newSubject.class_code}
            >
              <option value="">Select Commencement Year</option>
              {newSubject.class_code &&
                Array.from(
                  new Set(
                    classes
                      .filter(
                        (c) => c.class_code.toString() === newSubject.class_code
                      )
                      .map((c) => c.commencement_year)
                  )
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
            {/* Teacher Dropdown for Creating Subject */}
            <select
              className="input-primary w-full mb-2"
              value={newSubject.teacher || ""}
              onChange={(e) =>
                setNewSubject({ ...newSubject, teacher: e.target.value })
              }
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateSubject}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Subject Modal */}
      {editModal && editSubject && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Edit Subject</h3>
            <input
              type="text"
              placeholder="Subject Name"
              className="input-primary w-full mb-2"
              value={editSubject.subject_name}
              onChange={(e) =>
                setEditSubject({ ...editSubject, subject_name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Subject Code"
              className="input-primary w-full mb-2"
              value={editSubject.subject_code}
              onChange={(e) =>
                setEditSubject({ ...editSubject, subject_code: e.target.value })
              }
            />
            <textarea
              placeholder="Description"
              className="input-primary w-full h-24 mb-2"
              value={editSubject.description}
              onChange={(e) =>
                setEditSubject({ ...editSubject, description: e.target.value })
              }
            />
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Max Hours"
                className="input-primary w-full mb-2"
                value={editSubject.max_no_of_hours}
                onChange={(e) =>
                  setEditSubject({
                    ...editSubject,
                    max_no_of_hours: e.target.value,
                  })
                }
              />
              <input
                type="number"
                placeholder="Hours Conducted"
                className="input-primary w-full mb-2"
                value={editSubject.hours_conducted}
                onChange={(e) =>
                  setEditSubject({
                    ...editSubject,
                    hours_conducted: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                className="input-primary w-full mb-2"
                value={editSubject.start_date}
                onChange={(e) =>
                  setEditSubject({ ...editSubject, start_date: e.target.value })
                }
              />
              <input
                type="date"
                className="input-primary w-full mb-2"
                value={editSubject.end_date}
                onChange={(e) =>
                  setEditSubject({ ...editSubject, end_date: e.target.value })
                }
              />
            </div>
            <input
              type="number"
              placeholder="Semester"
              className="input-primary w-full mb-2"
              value={editSubject.semester}
              onChange={(e) =>
                setEditSubject({ ...editSubject, semester: e.target.value })
              }
            />
            {/* Dropdown for selecting Class Code */}
            <select
              className="input-primary w-full mb-2"
              value={editSubject.class_code}
              onChange={(e) => handleClassSelection(e.target.value)}
            >
              <option value="">Select Class Code</option>
              {Array.from(new Set(classes.map((c) => c.class_code))).map(
                (classCode) => (
                  <option key={classCode} value={classCode}>
                    {classCode}
                  </option>
                )
              )}
            </select>
            {/* Dropdown for selecting Commencement Year */}
            <select
              className="input-primary w-full mb-2"
              value={editSubject?.commencement_year || ""}
              onChange={(e) => {
                console.log(
                  "📌 Dropdown onChange fired with value:",
                  e.target.value
                );
                handleYearSelection(e.target.value);
              }}
              disabled={!editSubject?.class_code || availableYears.length === 0}
            >
              <option value="">Select Commencement Year</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {/* Teacher Dropdown for Editing Subject */}
            <select
              className="input-primary w-full mb-2"
              value={editSubject.teacher || ""}
              onChange={(e) =>
                setEditSubject({ ...editSubject, teacher: e.target.value })
              }
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateSubject}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal (Subject) */}
      {deleteModal && subjectToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">
              Are you sure you want to delete this subject?
            </h3>
            <p className="mb-4">
              Subject: <strong>{subjectToDelete.subject_name}</strong> | Code:{" "}
              <strong>{subjectToDelete.subject_code}</strong> | Class Code:{" "}
              <strong>{subjectToDelete.class_code}</strong> | Commencement Year:{" "}
              <strong>{subjectToDelete.commencement_year}</strong>
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-500"
                onClick={handleDeleteSubject}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Table with Subject Data */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-semibold mb-2">All Subjects</h3>
        {filteredSubjects.length === 0 ? (
          <p className="text-gray-500">No subjects found.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "Subject Name",
                    "Subject Code",
                    "Description",
                    "Max Hours",
                    "Hours Conducted",
                    "Semester",
                    "Class Code",
                    "Commencement Year",
                    "Teacher",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-3 text-left text-sm   text-gray-800 md:whitespace-normal"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr
                    key={subject._id}
                    className="border-t odd:bg-gray-50 hover:bg-gray-100"
                  >
                    <td className="p-3 break-words md:whitespace-normal">
                      {subject.subject_name}
                    </td>
                    <td className="p-3 break-words md:whitespace-normal">
                      {subject.subject_code}
                    </td>
                    <td className="p-3 break-words md:whitespace-normal">
                      {subject.description}
                    </td>
                    <td className="p-3">{subject.max_no_of_hours}</td>
                    <td className="p-3">{subject.hours_conducted}</td>
                    <td className="p-3">{subject.semester}</td>
                    <td className="p-3">{subject.class_code}</td>
                    <td className="p-3">{subject.commencement_year}</td>
                    <td className="p-3">
                      {subject.teacher
                        ? `${subject.teacher.name} (${subject.teacher.email})`
                        : "N/A"}
                    </td>
                    <td className="p-3 flex gap-3">
                      <Edit
                        className="text-blue-500 cursor-pointer"
                        onClick={() => handleEditSubject(subject)}
                      />
                      <Trash
                        className="text-red-500 cursor-pointer"
                        onClick={() => confirmDeleteSubject(subject)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
