#include "ElectricalSystems/ElectricalBatteryComponent.h"

UElectricalBatteryComponent::UElectricalBatteryComponent()
	: NominalVoltage(12.0f)
	, CapacityAmpHours(65.0f)
	, StateOfCharge(0.88f)
	, HealthyInternalResistance(0.015f)
	, TerminalCorrosionResistance(0.0f)
	, HealthPercentage(100.0f)
	, bIsConnected(true)
{
	PrimaryComponentTick.bCanEverTick = false;
}

float UElectricalBatteryComponent::GetOpenCircuitVoltage() const
{
	if (!bIsConnected) return 0.0f;
	const float BaseVoc = (NominalVoltage >= 20.0f) ? 23.6f : 11.8f;
	const float FullRange = (NominalVoltage >= 20.0f) ? 1.84f : 0.92f;
	return BaseVoc + (StateOfCharge * FullRange);
}

float UElectricalBatteryComponent::GetEffectiveInternalResistance() const
{
	const float DegradationFactor = 1.0f + (FMath::Max(0.0f, 100.0f - HealthPercentage) * 0.08f);
	return (HealthyInternalResistance * DegradationFactor) + TerminalCorrosionResistance;
}

float UElectricalBatteryComponent::GetTerminalVoltage(float DischargeCurrentAmps) const
{
	if (!bIsConnected) return 0.0f;
	const float Voc = GetOpenCircuitVoltage();
	const float Rint = GetEffectiveInternalResistance();
	const float Vterm = Voc - (DischargeCurrentAmps * Rint);
	return FMath::Max(0.0f, Vterm);
}

float UElectricalBatteryComponent::StepSimulation(float CurrentAmps, float DeltaTimeSeconds)
{
	if (!bIsConnected || DeltaTimeSeconds <= 0.0f) return StateOfCharge;

	float DeltaAh = (CurrentAmps * DeltaTimeSeconds) / 3600.0f;
	if (CurrentAmps < 0.0f)
	{
		DeltaAh *= 0.88f; // Charging efficiency
	}

	const float DeltaSoc = -DeltaAh / CapacityAmpHours;
	StateOfCharge = FMath::Clamp(StateOfCharge + DeltaSoc, 0.0f, 1.0f);
	return StateOfCharge;
}

FCrankingSimulationResult UElectricalBatteryComponent::SimulateCranking(float StarterMotorResistance, float GroundPathResistance) const
{
	FCrankingSimulationResult Result;
	Result.OpenCircuitVoltage = GetOpenCircuitVoltage();

	const float RTotal = GetEffectiveInternalResistance() + StarterMotorResistance + GroundPathResistance;
	Result.CrankingCurrentAmps = (RTotal > 0.001f) ? (Result.OpenCircuitVoltage / RTotal) : 0.0f;
	Result.LoadedTerminalVoltage = GetTerminalVoltage(Result.CrankingCurrentAmps);
	Result.GroundPathVoltageDrop = Result.CrankingCurrentAmps * GroundPathResistance;
	Result.bIsSufficientToCrank = (Result.CrankingCurrentAmps >= 100.0f && Result.LoadedTerminalVoltage >= 9.6f && Result.GroundPathVoltageDrop < 0.35f);

	return Result;
}
