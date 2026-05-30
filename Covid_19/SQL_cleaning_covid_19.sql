SELECT * from CovidVaccinations
ORDER by 3,4

--Looking at Total Cases vs Total Death
SELECT location, date, total_cases, new_cases, total_deaths, population
FROM CovidDeaths
order by 1,2

--show percentage of death in US
SELECT location, date, total_cases, total_deaths,
       (1.0 * total_deaths / total_cases) * 100 AS "DeathPểcntage"
FROM CovidDeaths
WHERE location LIKE '%state%'
ORDER BY 1,2;

--Discorvering covid case vs population
--show percentage of covid victim in US
SELECT location, date, total_cases, population,
       (1.0 * total_cases / population) * 100 AS "victim ratio"
FROM CovidDeaths
WHERE location LIKE '%state%'
ORDER BY 1,2;

--Looking at Countries with Highest Infection Rate compared to Population
SELECT location, population, MAX(total_cases) as HighestInfectionCount,
			max((1.0 * total_cases / population)) * 100 AS "PercentPopulationInfected"
FROM CovidDeaths
--WHERE location LIKE '%state%'
GROUP BY location, population
ORDER BY PercentPopulationInfected desc;


--showing the countries with the highest death count per population
SELECT location, MAX(cast(total_deaths as INT)) as TotalDeathCount
FROM CovidDeaths
--WHERE location LIKE '%state%'
WHERE continent is not null
GROUP BY location
ORDER BY TotalDeathCount desc;

--let break thing down by continent
SELECT continent, MAX(cast(total_deaths as INT)) as TotalDeathCount
FROM CovidDeaths
--WHERE location LIKE '%state%'
WHERE continent is not null
GROUP BY continent
ORDER BY TotalDeathCount desc;

--Showing contintents with the highest death count per population
SELECT continent,
       (1.0 * SUM(CAST(total_deaths AS REAL)) / SUM(population)) * 100 AS "Death count per population"
FROM CovidDeaths
WHERE continent IS NOT NULL
GROUP BY continent
ORDER BY "Death count per population" DESC;

--GLOBAL NUMBERS
Select SUM(new_cases) as total_cases, SUM(cast(new_deaths as int)) as total_deaths, SUM(cast(new_deaths as int))/SUM(New_Cases)*100 as DeathPercentage
From CovidDeaths
--Where location like '%states%'
where continent is not null 
--Group By date
order by 1,2


SELECT *
FROM CovidDeaths dea
JOIN CovidVaccinations vac 
	on dea.location = vac.location
	and dea.date = vac.date
	
-- Total Population vs Vaccinations
-- Shows Percentage of Population that has recieved at least one Covid Vaccine

Select dea.continent, dea.location, dea.date, dea.population, vac.new_vaccinations
, SUM(CAST(vac.new_vaccinations AS INT)) OVER (Partition by dea.Location Order by dea.location, dea.Date) as RollingPeopleVaccinated
--, (RollingPeopleVaccinated/population)*100
From CovidDeaths as dea
Join CovidVaccinations as vac
	On dea.location = vac.location
	and dea.date = vac.date
where dea.continent is not null 
order by 2,3

-- Use CTE
WITH PopvsVac (continent, location, date, population, new_vaccinations, RollingPeopleVaccinated)
as
(
Select dea.continent, dea.location, dea.date, dea.population, vac.new_vaccinations
, SUM(CAST(vac.new_vaccinations AS INT)) OVER (Partition by dea.Location Order by dea.location, dea.Date) as RollingPeopleVaccinated
From CovidDeaths as dea
Join CovidVaccinations as vac
	On dea.location = vac.location
	and dea.date = vac.date
where dea.continent is not null 
)

SELECT *, (1.0*RollingPeopleVaccinated/population) *100
FROM PopvsVac

--TEMP TABLE

DROP TABLE IF EXISTS PercentPopulationVaccinated;

CREATE TABLE PercentPopulationVaccinated
(
    Continent TEXT,
    Location TEXT,
    Date TEXT,
    Population REAL,
    New_vaccinations REAL,
    RollingPeopleVaccinated REAL
);

INSERT INTO PercentPopulationVaccinated
SELECT dea.continent,
       dea.location,
       dea.date,
       dea.population,
       vac.new_vaccinations,
       SUM(CAST(vac.new_vaccinations AS INT))
           OVER (
               PARTITION BY dea.location
               ORDER BY dea.date
           ) AS RollingPeopleVaccinated
FROM CovidDeaths AS dea
JOIN CovidVaccinations AS vac
    ON dea.location = vac.location
   AND dea.date = vac.date;

   SELECT *,
       (1.0 * RollingPeopleVaccinated / Population) * 100 AS PercentVaccinated
FROM PercentPopulationVaccinated;


--Creating View to store data for later visualizations
CREATE VIEW PercentPopulationVaccinated AS
SELECT
    dea.continent,
    dea.location,
    dea.date,
    dea.population,
    vac.new_vaccinations,
    SUM(CAST(vac.new_vaccinations AS INT))
        OVER (
            PARTITION BY dea.location
            ORDER BY dea.date
        ) AS RollingPeopleVaccinated
FROM CovidDeaths AS dea
JOIN CovidVaccinations AS vac
    ON dea.location = vac.location
   AND dea.date = vac.date
WHERE dea.continent IS NOT NULL