import React, { useEffect, useState, useCallback } from 'react';
import { Autocomplete, TextField, CircularProgress, Grid, Button, Box } from '@mui/material';
import './Jobs.css';

interface Job {
  _id: string;
  Link: string;
  Name: string;
  Com_name: string;
  Experience: string;
  Salary: string;
  Location: string;
  SkillRequirements: string[];
  DatePosted: string;
  CompanyLogo: string | null;
  Bookmarked: boolean;
}

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showBookmarked, setShowBookmarked] = useState<boolean>(false);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
      setFilteredJobs(data);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle bookmark toggle
  const toggleBookmark = async (jobId: string) => {
    const updatedJobs = jobs.map((job) => {
      if (job._id === jobId) {
        return { ...job, Bookmarked: !job.Bookmarked };
      }
      return job;
    });

    setJobs(updatedJobs);
    setFilteredJobs(updatedJobs.filter((job) => (showBookmarked ? job.Bookmarked : true)));

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Bookmarked: updatedJobs.find((job) => job._id === jobId)?.Bookmarked,
        }),
      });

      if (!response.ok) throw new Error('Failed to update bookmark status');
    } catch (error) {
      console.error('Error updating bookmark:', error);
      setError('Error updating bookmark');
    }
  };

  // Toggle bookmarked jobs visibility
  const toggleShowBookmarked = () => {
    setShowBookmarked((prev) => {
      const newShowBookmarked = !prev;
      setFilteredJobs(newShowBookmarked ? jobs.filter((job) => job.Bookmarked) : jobs);
      return newShowBookmarked;
    });
  };

  // Filtering logic
  useEffect(() => {
    let updatedJobs = jobs;

    if (searchTerm) {
      updatedJobs = updatedJobs.filter(
        (job) =>
          job.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.Com_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLocation) {
      updatedJobs = updatedJobs.filter((job) => job.Location === selectedLocation);
    }

    if (selectedSkills.length > 0) {
      updatedJobs = updatedJobs.filter((job) =>
        selectedSkills.every((skill) => job.SkillRequirements.includes(skill))
      );
    }

    setFilteredJobs(updatedJobs.filter((job) => (showBookmarked ? job.Bookmarked : true)));
  }, [searchTerm, selectedLocation, selectedSkills, jobs, showBookmarked]);

  if (loading) return <CircularProgress />;
  if (error) return <div>Error: {error}</div>;

  // Get unique locations and skills
  const uniqueLocations = Array.from(new Set(jobs.map((job) => job.Location))).sort();
  const uniqueSkills = Array.from(new Set(jobs.flatMap((job) => job.SkillRequirements))).sort();

  return (
    <div className="jobs-container">
<h1 className="text-3xl font-bold text-gray-800 mb-4">🔍 Explore Job Opportunities</h1>

      {/* Filters */}
      <Box sx={{ p: 2, mb: 2, bgcolor: 'white', boxShadow: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Bar */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Search Job Title or Company"
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>

          {/* Location Filter */}
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={uniqueLocations}
              value={selectedLocation}
              onChange={(event, newValue) => setSelectedLocation(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Location" variant="outlined" />}
            />
          </Grid>

          {/* Skills Filter */}
          <Grid item xs={12} sm={4}>
            <Autocomplete
              multiple
              options={uniqueSkills}
              value={selectedSkills}
              onChange={(event, newValue) => setSelectedSkills(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Skills" variant="outlined" />}
            />
          </Grid>

          {/* Reset Filters & Bookmark Toggle */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="contained" color="primary" onClick={() => {
              setSearchTerm('');
              setSelectedLocation(null);
              setSelectedSkills([]);
              setShowBookmarked(false);
              setFilteredJobs(jobs);
            }}>
              Reset Filters
            </Button>
            <Button variant="contained" color="secondary" onClick={toggleShowBookmarked}>
              {showBookmarked ? 'Show All Jobs' : 'Show Bookmarked Jobs'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Jobs List */}
      <div className="jobs-grid">
        {filteredJobs.map((job) => (
          <div className={`job-card ${job.Bookmarked ? 'bookmarked' : ''}`} key={job._id}>
            <button
              className={`bookmark-button ${job.Bookmarked ? 'bookmarked' : ''}`}
              onClick={() => toggleBookmark(job._id)}
            >
              {job.Bookmarked ? '★' : '☆'}
            </button>
            <div className="job-header">
              {job.CompanyLogo && job.CompanyLogo !== 'No logo available' ? (
                <img src={job.CompanyLogo} alt="Company Logo" className="job-logo" />
              ) : (
                <img src="/src/pages/blank_logo_image.png" alt="No logo available" className="job-logo" />
              )}
              <div className="job-title">
                <h2>{job.Name}</h2>
                <p>{job.Com_name}</p>
              </div>
            </div>
            <div className="job-details">
              <p><strong>Location:</strong> {job.Location}</p>
              <p><strong>Salary:</strong> {job.Salary}</p>
              <p><strong>Experience:</strong> {job.Experience}</p>
              <p><strong>Date Posted:</strong> {job.DatePosted}</p>
            </div>
            <div className="job-skills">
              {job.SkillRequirements.map((skill, skillIndex) => (
                <span key={skillIndex} className="skill-box">{skill}</span>
              ))}
            </div>
            <a href={job.Link} target="_blank" rel="noopener noreferrer" className="job-apply-link">
              View Job Details
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Jobs;
