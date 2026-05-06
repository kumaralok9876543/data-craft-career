declare module "linkedin-jobs-api" {
  interface QueryOptions {
    keyword?: string;
    location?: string;
    dateSincePosted?: string;
    jobType?: string;
    remoteFilter?: string;
    salary?: string;
    experienceLevel?: string;
    limit?: string;
    sortBy?: string;
    page?: string;
  }

  interface Job {
    position: string;
    company: string;
    companyLogo: string;
    location: string;
    date: string;
    agoTime: string;
    salary: string;
    jobUrl: string;
  }

  function query(options: QueryOptions): Promise<Job[]>;
  export default { query };
  export { query };
}
